export type ScanFormat = 'glb' | 'gltf' | 'obj' | 'usdz';

export interface Scan {
  id: string;
  original_name: string;
  stored_name: string;
  format: ScanFormat;
  size_bytes: number;
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

export interface Project {
  id: string;
  name: string;
  scan_id: string;
  furniture: FurnitureInstance[];
  created_at: string;
  updated_at: string;
}
