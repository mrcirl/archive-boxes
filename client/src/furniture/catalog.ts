import type { CustomItem, FurnitureInstance, HollowStyle } from '../types';
import { CUSTOM_TYPE_PREFIX } from '../store/layoutStore';

export interface FurnitureDef {
  type: string;
  label: string;
  color: string;
  widthM: number;
  depthM: number;
  heightM: number;
  hollow?: HollowStyle;
  photoUrl?: string | null;
  modelUrl?: string | null;
  modelFormat?: 'glb' | 'gltf' | 'obj' | null;
}

export const FURNITURE_CATALOG: FurnitureDef[] = [
  { type: 'desk', label: 'Desk', color: '#c48a53', widthM: 1.4, depthM: 0.7, heightM: 0.75 },
  { type: 'desk-l', label: 'L-Desk', color: '#b8794a', widthM: 1.6, depthM: 1.4, heightM: 0.75 },
  { type: 'chair', label: 'Chair', color: '#3b3b3b', widthM: 0.55, depthM: 0.55, heightM: 0.9 },
  { type: 'round-table', label: 'Round Table', color: '#8a6a4a', widthM: 1.2, depthM: 1.2, heightM: 0.75 },
  { type: 'cabinet', label: 'Filing Cabinet', color: '#6b6b6b', widthM: 0.45, depthM: 0.6, heightM: 1.3 },
  { type: 'bookshelf', label: 'Bookshelf', color: '#7a5230', widthM: 0.9, depthM: 0.35, heightM: 1.8 },
  { type: 'sofa', label: 'Sofa', color: '#4a6b8a', widthM: 1.8, depthM: 0.85, heightM: 0.8 },
  { type: 'plant', label: 'Plant', color: '#3f7a3f', widthM: 0.5, depthM: 0.5, heightM: 1.1 },
];

export function customItemType(id: string): string {
  return `${CUSTOM_TYPE_PREFIX}${id}`;
}

export function customItemToDef(item: CustomItem): FurnitureDef {
  return {
    type: customItemType(item.id),
    label: item.name,
    color: item.color,
    widthM: item.widthM,
    depthM: item.depthM,
    heightM: item.heightM,
    hollow: item.hollow,
    photoUrl: item.photoUrl,
    modelUrl: item.modelUrl,
    modelFormat: item.modelFormat,
  };
}

/** Resolves a furniture instance's `type` to its definition, checking the
 * built-in catalog first and falling back to a project's custom items. */
export function resolveItemDef(type: string, customItems: CustomItem[]): FurnitureDef {
  if (type.startsWith(CUSTOM_TYPE_PREFIX)) {
    const id = type.slice(CUSTOM_TYPE_PREFIX.length);
    const custom = customItems.find((c) => c.id === id);
    if (custom) return customItemToDef(custom);
  }
  return FURNITURE_CATALOG.find((f) => f.type === type) ?? FURNITURE_CATALOG[0];
}

/** Definition merged with any per-instance dimension/hollow overrides —
 * what actually gets rendered and measured for a placed item. */
export function resolveInstanceDef(
  instance: FurnitureInstance,
  customItems: CustomItem[]
): FurnitureDef {
  const def = resolveItemDef(instance.type, customItems);
  return {
    ...def,
    widthM: instance.widthM ?? def.widthM,
    depthM: instance.depthM ?? def.depthM,
    heightM: instance.heightM ?? def.heightM,
    hollow: instance.hollow ?? def.hollow ?? 'none',
  };
}
