import type { Scan, Project, FurnitureInstance, CustomItem, ImageSearchResult } from './types';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: init?.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function scanFileUrl(scan: Scan): string {
  return `${API_BASE}/uploads/${scan.stored_name}`;
}

export function scanPreviewUrl(scan: Scan): string | null {
  return scan.preview_stored_name ? `${API_BASE}/uploads/${scan.preview_stored_name}` : null;
}

export function assetUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `${API_BASE}${url}`;
}

export const scansApi = {
  list: () => request<Scan[]>('/api/scans'),
  get: (id: string) => request<Scan>(`/api/scans/${id}`),
  upload: (file: File) => {
    const form = new FormData();
    form.append('scan', file);
    return request<Scan>('/api/scans/upload', { method: 'POST', body: form });
  },
  remove: (id: string) => request<void>(`/api/scans/${id}`, { method: 'DELETE' }),
};

export const projectsApi = {
  list: () => request<Project[]>('/api/projects'),
  get: (id: string) => request<Project>(`/api/projects/${id}`),
  create: (name: string, scanId: string) =>
    request<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name, scanId }),
    }),
  update: (id: string, patch: { name?: string; furniture?: FurnitureInstance[]; customItems?: CustomItem[] }) =>
    request<Project>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  remove: (id: string) => request<void>(`/api/projects/${id}`, { method: 'DELETE' }),
};

export interface UploadedAsset {
  kind: 'image' | 'model';
  format: string;
  url: string;
}

export const assetsApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('asset', file);
    return request<UploadedAsset>('/api/assets/upload', { method: 'POST', body: form });
  },
};

export const imageSearchApi = {
  search: (query: string) =>
    request<ImageSearchResult[]>(`/api/image-search?q=${encodeURIComponent(query)}`),
};
