import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { resolveInstanceDef } from '../furniture/catalog';
import { useLayoutStore } from '../store/layoutStore';
import { assetUrl } from '../api';
import { CustomModel, PhotoBillboard } from './CustomItemVisual';
import type { FurnitureInstance, HollowStyle } from '../types';
import type { ViewMode } from './Toolbar';

interface PanelMaterialProps {
  color: string;
  isSelected: boolean;
}

function PanelMaterial({ color, isSelected }: PanelMaterialProps) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={isSelected ? '#ffffff' : '#000000'}
      emissiveIntensity={isSelected ? 0.25 : 0}
    />
  );
}

/** An open shell built from panels instead of a solid block: 'top' is a
 * box/bin open at the top, 'front' is a rack/bookcase open toward +z (the
 * item's local front, so rotating the item turns the opening with it). */
function HollowShell({
  w,
  h,
  d,
  style,
  color,
  isSelected,
}: {
  w: number;
  h: number;
  d: number;
  style: Exclude<HollowStyle, 'none'>;
  color: string;
  isSelected: boolean;
}) {
  const t = Math.min(0.03, Math.min(w, h, d) * 0.15);
  const mat = <PanelMaterial color={color} isSelected={isSelected} />;
  // Same-color interiors read as a closed block from a distance, so shade
  // the cavity distinctly darker — the dark opening is what makes the item
  // legible as hollow at plan-view zoom levels.
  const cavityColor = useMemo(
    () => `#${new THREE.Color(color).multiplyScalar(0.35).getHexString()}`,
    [color]
  );

  return (
    <group>
      {/* bottom */}
      <mesh position={[0, t / 2, 0]} castShadow>
        <boxGeometry args={[w, t, d]} />
        {mat}
      </mesh>
      {/* cavity: a darker inset volume recessed behind the opening, so the
          item reads as hollow from any viewing angle */}
      {style === 'top' ? (
        <mesh position={[0, t + (h - t - Math.min(0.08, h * 0.15)) / 2, 0]}>
          <boxGeometry args={[w - 2 * t, h - t - Math.min(0.08, h * 0.15), d - 2 * t]} />
          <meshStandardMaterial color={cavityColor} />
        </mesh>
      ) : (
        <mesh position={[0, h / 2, (t - Math.min(0.08, d * 0.15)) / 2]}>
          <boxGeometry args={[w - 2 * t, h - 2 * t, d - t - Math.min(0.08, d * 0.15)]} />
          <meshStandardMaterial color={cavityColor} />
        </mesh>
      )}
      {/* left / right walls */}
      <mesh position={[-w / 2 + t / 2, h / 2, 0]} castShadow>
        <boxGeometry args={[t, h, d]} />
        {mat}
      </mesh>
      <mesh position={[w / 2 - t / 2, h / 2, 0]} castShadow>
        <boxGeometry args={[t, h, d]} />
        {mat}
      </mesh>
      {/* back wall */}
      <mesh position={[0, h / 2, -d / 2 + t / 2]} castShadow>
        <boxGeometry args={[w, h, t]} />
        {mat}
      </mesh>
      {style === 'top' ? (
        /* open top → keep the front wall */
        <mesh position={[0, h / 2, d / 2 - t / 2]} castShadow>
          <boxGeometry args={[w, h, t]} />
          {mat}
        </mesh>
      ) : (
        /* open front → keep the top panel */
        <mesh position={[0, h - t / 2, 0]} castShadow>
          <boxGeometry args={[w, t, d]} />
          {mat}
        </mesh>
      )}
    </group>
  );
}

function DimensionLabel({ w, d, h, y }: { w: number; d: number; h: number; y: number }) {
  const cm = (m: number) => Math.round(m * 100);
  return (
    <Html position={[0, y, 0]} center zIndexRange={[0, 0]}>
      <div className="dimension-label">
        {cm(w)} × {cm(d)} × {cm(h)} cm
      </div>
    </Html>
  );
}

/** Click-and-drag grip shown above a selected item (3D view only) for
 * adjusting its height off the floor directly in the viewport, mirroring
 * the horizontal drag on the item body itself. */
function VerticalHandle({
  y,
  locked,
  onPointerDown,
}: {
  y: number;
  locked?: boolean;
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
}) {
  const color = locked ? '#e0a63e' : '#4da3ff';
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, -0.09, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.18, 6]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Larger invisible sphere as the actual hit target — the visible
          grip is deliberately small so it doesn't clutter the scene. */}
      <mesh onPointerDown={onPointerDown}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

export function FurnitureMesh({
  item,
  mode,
  showDimensions,
}: {
  item: FurnitureInstance;
  mode: ViewMode;
  showDimensions: boolean;
}) {
  const customItems = useLayoutStore((s) => s.customItems);
  const def = resolveInstanceDef(item, customItems);
  const select = useLayoutStore((s) => s.select);
  const setDragging = useLayoutStore((s) => s.setDragging);
  const setVerticalDragging = useLayoutStore((s) => s.setVerticalDragging);
  const selectedId = useLayoutStore((s) => s.selectedId);
  const isSelected = selectedId === item.id;

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    select(item.id);
    if (!item.locked) setDragging(item.id);
  };

  const onVerticalPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (item.locked) return;
    select(item.id);
    setVerticalDragging(item.id);
  };

  // With a reference photo (and no model), draw the box as a thin footprint
  // pad instead of full height — a full box would swallow the billboard,
  // which sits at the item's real height and is what actually identifies it
  // in 3D. The pad still carries the correct width/depth for 2D/selection.
  const hollow = def.hollow ?? 'none';
  const hasPhotoOnly = !def.modelUrl && !!def.photoUrl && hollow === 'none';
  const boxHeight = hasPhotoOnly ? Math.min(0.06, def.heightM) : def.heightM;

  return (
    <group position={[item.x, item.y ?? 0, item.z]} rotation={[0, item.rotationY, 0]}>
      {def.modelUrl ? (
        <group onPointerDown={onPointerDown}>
          <CustomModel
            url={assetUrl(def.modelUrl)}
            format={def.modelFormat ?? 'glb'}
            target={{ w: def.widthM, h: def.heightM, d: def.depthM }}
          />
        </group>
      ) : hollow !== 'none' ? (
        <group onPointerDown={onPointerDown}>
          <HollowShell
            w={def.widthM}
            h={def.heightM}
            d={def.depthM}
            style={hollow}
            color={def.color}
            isSelected={isSelected}
          />
        </group>
      ) : (
        <mesh position={[0, boxHeight / 2, 0]} onPointerDown={onPointerDown} castShadow>
          <boxGeometry args={[def.widthM, boxHeight, def.depthM]} />
          <PanelMaterial color={def.color} isSelected={isSelected} />
        </mesh>
      )}

      {!def.modelUrl && def.photoUrl && mode === '3d' && (
        <PhotoBillboard url={assetUrl(def.photoUrl)} widthM={def.widthM} heightM={def.heightM} />
      )}

      {showDimensions && (
        <DimensionLabel w={def.widthM} d={def.depthM} h={def.heightM} y={def.heightM + 0.18} />
      )}

      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(def.widthM, def.depthM) * 0.62, Math.max(def.widthM, def.depthM) * 0.68, 32]} />
          <meshBasicMaterial color={item.locked ? '#e0a63e' : '#4da3ff'} />
        </mesh>
      )}

      {isSelected && mode === '3d' && (
        <VerticalHandle y={def.heightM + 0.35} locked={item.locked} onPointerDown={onVerticalPointerDown} />
      )}
    </group>
  );
}
