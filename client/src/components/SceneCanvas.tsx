import { useRef } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, PerspectiveCamera, Grid } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { ScanMesh } from './ScanMesh';
import { FurnitureMesh } from './FurnitureMesh';
import { useLayoutStore } from '../store/layoutStore';
import type { Scan } from '../types';
import type { ViewMode } from './Toolbar';

function DragPlane() {
  const draggingId = useLayoutStore((s) => s.draggingId);
  const setPosition = useLayoutStore((s) => s.setPosition);
  const setDragging = useLayoutStore((s) => s.setDragging);

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!draggingId) return;
    e.stopPropagation();
    setPosition(draggingId, e.point.x, e.point.z);
  };

  const onPointerUp = () => {
    if (draggingId) setDragging(null);
  };

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      visible={false}
    >
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial />
    </mesh>
  );
}

export function SceneCanvas({ scan, mode }: { scan: Scan; mode: ViewMode }) {
  const furniture = useLayoutStore((s) => s.furniture);
  const select = useLayoutStore((s) => s.select);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const draggingId = useLayoutStore((s) => s.draggingId);

  return (
    <Canvas shadows onPointerMissed={() => select(null)}>
      {mode === '3d' ? (
        <PerspectiveCamera makeDefault position={[6, 6, 6]} fov={50} />
      ) : (
        <OrthographicCamera makeDefault position={[0, 12, 0]} zoom={60} up={[0, 0, -1]} />
      )}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={!draggingId}
        enableRotate={mode === '3d'}
        minDistance={1}
        maxDistance={40}
        target={[0, 0, 0]}
      />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <Grid args={[40, 40]} cellColor="#888" sectionColor="#555" fadeDistance={30} position={[0, 0, 0]} />
      <DragPlane />
      <ScanMesh scan={scan} />
      {furniture.map((item) => (
        <FurnitureMesh key={item.id} item={item} />
      ))}
    </Canvas>
  );
}
