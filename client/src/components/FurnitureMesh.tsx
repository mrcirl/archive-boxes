import { useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Mesh } from 'three';
import { resolveItemDef } from '../furniture/catalog';
import { useLayoutStore } from '../store/layoutStore';
import { assetUrl } from '../api';
import { CustomModel, PhotoBillboard } from './CustomItemVisual';
import type { FurnitureInstance } from '../types';
import type { ViewMode } from './Toolbar';

export function FurnitureMesh({ item, mode }: { item: FurnitureInstance; mode: ViewMode }) {
  const customItems = useLayoutStore((s) => s.customItems);
  const def = resolveItemDef(item.type, customItems);
  const meshRef = useRef<Mesh>(null);
  const select = useLayoutStore((s) => s.select);
  const setDragging = useLayoutStore((s) => s.setDragging);
  const selectedId = useLayoutStore((s) => s.selectedId);
  const isSelected = selectedId === item.id;

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    select(item.id);
    setDragging(item.id);
  };

  // With a reference photo (and no model), draw the box as a thin footprint
  // pad instead of full height — a full box would swallow the billboard,
  // which sits at the item's real height and is what actually identifies it
  // in 3D. The pad still carries the correct width/depth for 2D/selection.
  const hasPhotoOnly = !def.modelUrl && !!def.photoUrl;
  const boxHeight = hasPhotoOnly ? Math.min(0.06, def.heightM) : def.heightM;

  return (
    <group position={[item.x, 0, item.z]} rotation={[0, item.rotationY, 0]}>
      {def.modelUrl ? (
        <group onPointerDown={onPointerDown}>
          <CustomModel
            url={assetUrl(def.modelUrl)}
            format={def.modelFormat ?? 'glb'}
            target={{ w: def.widthM, h: def.heightM, d: def.depthM }}
          />
        </group>
      ) : (
        <mesh
          ref={meshRef}
          position={[0, boxHeight / 2, 0]}
          onPointerDown={onPointerDown}
          castShadow
        >
          <boxGeometry args={[def.widthM, boxHeight, def.depthM]} />
          <meshStandardMaterial
            color={def.color}
            emissive={isSelected ? '#ffffff' : '#000000'}
            emissiveIntensity={isSelected ? 0.25 : 0}
          />
        </mesh>
      )}

      {hasPhotoOnly && mode === '3d' && (
        <PhotoBillboard url={assetUrl(def.photoUrl!)} widthM={def.widthM} heightM={def.heightM} />
      )}

      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(def.widthM, def.depthM) * 0.62, Math.max(def.widthM, def.depthM) * 0.68, 32]} />
          <meshBasicMaterial color="#4da3ff" />
        </mesh>
      )}
    </group>
  );
}
