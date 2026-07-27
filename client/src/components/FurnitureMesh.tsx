import { useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Mesh } from 'three';
import { getFurnitureDef } from '../furniture/catalog';
import { useLayoutStore } from '../store/layoutStore';
import type { FurnitureInstance } from '../types';

export function FurnitureMesh({ item }: { item: FurnitureInstance }) {
  const def = getFurnitureDef(item.type);
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

  return (
    <group position={[item.x, 0, item.z]} rotation={[0, item.rotationY, 0]}>
      <mesh
        ref={meshRef}
        position={[0, def.heightM / 2, 0]}
        onPointerDown={onPointerDown}
        castShadow
      >
        <boxGeometry args={[def.widthM, def.heightM, def.depthM]} />
        <meshStandardMaterial
          color={def.color}
          emissive={isSelected ? '#ffffff' : '#000000'}
          emissiveIntensity={isSelected ? 0.25 : 0}
        />
      </mesh>
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(def.widthM, def.depthM) * 0.62, Math.max(def.widthM, def.depthM) * 0.68, 32]} />
          <meshBasicMaterial color="#4da3ff" />
        </mesh>
      )}
    </group>
  );
}
