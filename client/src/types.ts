export type ScanFormat = 'glb' | 'gltf' | 'obj' | 'usdz';

export interface Scan {
  id: string;
  original_name: string;
  stored_name: string;
  format: ScanFormat;
  size_bytes: number;
  preview_format: 'glb' | null;
  preview_stored_name: string | null;
  preview_error: string | null;
  created_at: string;
}

export interface FurnitureInstance {
  id: string;
  type: string;
  x: number;
  z: number;
  rotationY: number;
  label?: string;
}

export interface CustomItem {
  id: string;
  name: string;
  widthM: number;
  depthM: number;
  heightM: number;
  color: string;
  photoUrl: string | null;
  modelUrl: string | null;
  modelFormat: 'glb' | 'gltf' | 'obj' | null;
}

export interface Project {
  id: string;
  name: string;
  scan_id: string;
  furniture: FurnitureInstance[];
  customItems: CustomItem[];
  created_at: string;
  updated_at: string;
}

export interface ImageSearchResult {
  title: string;
  thumbUrl: string;
  pageUrl: string;
  license: string | null;
  artist: string | null;
}
