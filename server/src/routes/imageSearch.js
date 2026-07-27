import { Router } from 'express';

// Best-effort reference photo search via the Wikimedia Commons API — no API
// key required, and Commons content is under clear free licenses (unlike
// hotlinking arbitrary web images). This is NOT a product catalog: results
// are visual references only, not verified matches for a specific real
// product or its dimensions.
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'RoomLayoutApp/1.0 (office-layout-planner; no-contact-configured)';

export const imageSearchRouter = Router();

imageSearchRouter.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) return res.status(400).json({ error: 'q query param is required' });

  try {
    const searchUrl = new URL(COMMONS_API);
    searchUrl.search = new URLSearchParams({
      action: 'query',
      format: 'json',
      list: 'search',
      srnamespace: '6', // File: namespace
      srlimit: '12',
      srsearch: `${q} filetype:bitmap`,
    }).toString();

    const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': USER_AGENT } });
    if (!searchRes.ok) throw new Error(`Commons search failed: ${searchRes.status}`);
    const searchJson = await searchRes.json();
    const titles = (searchJson.query?.search ?? []).map((r) => r.title);
    if (titles.length === 0) return res.json([]);

    const infoUrl = new URL(COMMONS_API);
    infoUrl.search = new URLSearchParams({
      action: 'query',
      format: 'json',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: '400',
      titles: titles.join('|'),
    }).toString();

    const infoRes = await fetch(infoUrl, { headers: { 'User-Agent': USER_AGENT } });
    if (!infoRes.ok) throw new Error(`Commons imageinfo failed: ${infoRes.status}`);
    const infoJson = await infoRes.json();
    const pages = Object.values(infoJson.query?.pages ?? {});

    const results = pages
      .map((page) => {
        const info = page.imageinfo?.[0];
        if (!info) return null;
        return {
          title: page.title.replace(/^File:/, ''),
          thumbUrl: info.thumburl ?? info.url,
          pageUrl: info.descriptionurl,
          license: info.extmetadata?.LicenseShortName?.value ?? null,
          artist: info.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, '') ?? null,
        };
      })
      .filter(Boolean);

    res.json(results);
  } catch (err) {
    console.error('Image search failed for query', q, err);
    res.status(502).json({ error: 'Reference photo search is unavailable right now.' });
  }
});
