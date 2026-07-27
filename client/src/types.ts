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
  /** Present only for rooms created via "Draw a room" — the exact polygon
   * that was extruded into this scan's geometry, letting the viewer show
   * real per-wall lengths instead of just a bounding box. */
  wall_points_json: string | null;
  wall_height_m: number | null;
  created_at: string;
}

/** 'none' = solid block, 'top' = open-top shell (box/bin), 'front' = open-front shell (rack/bookcase). */
export type HollowStyle = 'none' | 'top' | 'front';

export interface FurnitureInstance {
  id: string;
  type: string;
  x: number;
  z: number;
  /** Height of the item's base above the floor — 0 for normal floor-standing
   * placement, positive for wall-mounted/floating items (e.g. a shelf). */
  y?: number;
  rotationY: number;
  label?: string;
  /** Per-instance overrides of the item definition's real dimensions. */
  widthM?: number;
  depthM?: number;
  heightM?: number;
  hollow?: HollowStyle;
  /** Locked items can't be dragged, rotated, or deleted until unlocked. */
  locked?: boolean;
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
  hollow?: HollowStyle;
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
