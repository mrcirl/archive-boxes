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

// Real 3D models (Kenney "Furniture Kit", CC0 — kenney.nl/assets/furniture-kit,
// see public/models/LICENSE.txt) non-uniformly scaled to these real-world
// dimensions, same fit-to-box logic used for custom item models. The models'
// own native scale isn't real-world meters, so target sizes are chosen for
// realism, not to match the source asset's raw proportions — kept close
// enough to each model's natural aspect ratio to avoid visible distortion.
export const FURNITURE_CATALOG: FurnitureDef[] = [
  { type: 'desk', label: 'Desk', color: '#c48a53', widthM: 1.4, depthM: 0.7, heightM: 0.75, modelUrl: '/models/desk.glb', modelFormat: 'glb' },
  { type: 'desk-l', label: 'L-Desk', color: '#b8794a', widthM: 1.6, depthM: 1.4, heightM: 0.75, modelUrl: '/models/deskCorner.glb', modelFormat: 'glb' },
  { type: 'chair', label: 'Chair', color: '#3b3b3b', widthM: 0.55, depthM: 0.55, heightM: 0.9, modelUrl: '/models/chairDesk.glb', modelFormat: 'glb' },
  { type: 'round-table', label: 'Round Table', color: '#8a6a4a', widthM: 1.2, depthM: 1.2, heightM: 0.75, modelUrl: '/models/tableRound.glb', modelFormat: 'glb' },
  { type: 'cabinet', label: 'Filing Cabinet', color: '#6b6b6b', widthM: 0.45, depthM: 0.45, heightM: 0.7, modelUrl: '/models/kitchenCabinetDrawer.glb', modelFormat: 'glb' },
  { type: 'bookshelf', label: 'Bookshelf', color: '#7a5230', widthM: 0.9, depthM: 0.35, heightM: 1.8, modelUrl: '/models/bookcaseOpen.glb', modelFormat: 'glb' },
  { type: 'sofa', label: 'Sofa', color: '#4a6b8a', widthM: 1.8, depthM: 0.85, heightM: 0.8, modelUrl: '/models/loungeSofa.glb', modelFormat: 'glb' },
  { type: 'plant', label: 'Plant', color: '#3f7a3f', widthM: 0.5, depthM: 0.5, heightM: 1.1, modelUrl: '/models/pottedPlant.glb', modelFormat: 'glb' },
  { type: 'monitor', label: 'Monitor', color: '#2a2c30', widthM: 0.4, depthM: 0.1, heightM: 0.3, modelUrl: '/models/computerScreen.glb', modelFormat: 'glb' },
  { type: 'laptop', label: 'Laptop', color: '#c7c9cc', widthM: 0.35, depthM: 0.25, heightM: 0.15, modelUrl: '/models/laptop.glb', modelFormat: 'glb' },
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
