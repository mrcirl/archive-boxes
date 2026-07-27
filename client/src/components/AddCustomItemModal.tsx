import { useState } from 'react';
import { assetsApi, assetUrl, imageSearchApi } from '../api';
import { useLayoutStore } from '../store/layoutStore';
import type { ImageSearchResult } from '../types';

type Unit = 'cm' | 'in';

function toMeters(value: string, unit: Unit): number {
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return unit === 'cm' ? n / 100 : n * 0.0254;
}

export function AddCustomItemModal({ onClose }: { onClose: () => void }) {
  const addCustomItem = useLayoutStore((s) => s.addCustomItem);

  const [name, setName] = useState('');
  const [unit, setUnit] = useState<Unit>('cm');
  const [width, setWidth] = useState('');
  const [depth, setDepth] = useState('');
  const [height, setHeight] = useState('');
  const [color, setColor] = useState('#8a6a4a');

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoLabel, setPhotoLabel] = useState<string | null>(null);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [modelFormat, setModelFormat] = useState<'glb' | 'gltf' | 'obj' | null>(null);
  const [uploading, setUploading] = useState<'photo' | 'model' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ImageSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  const handlePhotoUpload = async (file: File) => {
    setError(null);
    setUploading('photo');
    try {
      const asset = await assetsApi.upload(file);
      if (asset.kind !== 'image') throw new Error('That file is not an image.');
      setPhotoUrl(asset.url);
      setPhotoLabel(file.name);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(null);
    }
  };

  const handleModelUpload = async (file: File) => {
    setError(null);
    setUploading('model');
    try {
      const asset = await assetsApi.upload(file);
      if (asset.kind !== 'model') throw new Error('That file is not a GLB/GLTF/OBJ model.');
      setModelUrl(asset.url);
      setModelFormat(asset.format as 'glb' | 'gltf' | 'obj');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(null);
    }
  };

  const runSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const results = await imageSearchApi.search(searchQuery.trim());
      setSearchResults(results);
    } catch (e) {
      setSearchError((e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const pickSearchResult = (result: ImageSearchResult) => {
    setPhotoUrl(result.thumbUrl);
    setPhotoLabel(`${result.title} (Wikimedia Commons)`);
  };

  const widthM = toMeters(width, unit);
  const depthM = toMeters(depth, unit);
  const heightM = toMeters(height, unit);
  const canSubmit = name.trim().length > 0 && widthM > 0 && depthM > 0 && heightM > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    addCustomItem({
      name: name.trim(),
      widthM,
      depthM,
      heightM,
      color,
      photoUrl,
      modelUrl,
      modelFormat,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>New item</h3>
          <button onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standing desk" />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Width</span>
            <input value={width} onChange={(e) => setWidth(e.target.value)} inputMode="decimal" placeholder="120" />
          </label>
          <label className="field">
            <span>Depth</span>
            <input value={depth} onChange={(e) => setDepth(e.target.value)} inputMode="decimal" placeholder="60" />
          </label>
          <label className="field">
            <span>Height</span>
            <input value={height} onChange={(e) => setHeight(e.target.value)} inputMode="decimal" placeholder="75" />
          </label>
          <div className="unit-toggle">
            <button className={unit === 'cm' ? 'active' : ''} onClick={() => setUnit('cm')}>
              cm
            </button>
            <button className={unit === 'in' ? 'active' : ''} onClick={() => setUnit('in')}>
              in
            </button>
          </div>
        </div>

        <label className="field">
          <span>Color</span>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>

        <div className="field">
          <span>Photo (optional — shown as a card in 3D view)</span>
          <div className="upload-row">
            <label className="file-picker small">
              {uploading === 'photo' ? 'Uploading…' : 'Upload photo'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoUpload(file);
                }}
              />
            </label>
            <button onClick={() => setShowSearch((s) => !s)}>
              {showSearch ? 'Hide reference search' : 'Search reference photo'}
            </button>
          </div>
          {photoLabel && <div className="hint">Attached: {photoLabel}</div>}

          {showSearch && (
            <div className="reference-search">
              <p className="hint">
                Best-effort search of Wikimedia Commons (freely-licensed images) — a visual
                reference only, not a verified product match or dimension source.
              </p>
              <div className="inline-form">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. office desk"
                  onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                />
                <button onClick={runSearch} disabled={searching}>
                  {searching ? 'Searching…' : 'Search'}
                </button>
              </div>
              {searchError && <div className="error-banner">{searchError}</div>}
              {searchResults && searchResults.length === 0 && <p className="hint">No results.</p>}
              {searchResults && searchResults.length > 0 && (
                <div className="search-results-grid">
                  {searchResults.map((r) => (
                    <button key={r.pageUrl} className="search-result" onClick={() => pickSearchResult(r)}>
                      <img src={assetUrl(r.thumbUrl)} alt={r.title} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <label className="field">
          <span>3D model (optional — GLB/GLTF/OBJ, overrides the box shape, scaled to your dimensions)</span>
          <label className="file-picker small">
            {uploading === 'model' ? 'Uploading…' : 'Upload model'}
            <input
              type="file"
              accept=".glb,.gltf,.obj"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleModelUpload(file);
              }}
            />
          </label>
          {modelUrl && <div className="hint">Attached: {modelUrl.split('/').pop()}</div>}
        </label>

        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="save-btn" onClick={handleSubmit} disabled={!canSubmit}>
            Add to palette
          </button>
        </div>
      </div>
    </div>
  );
}
