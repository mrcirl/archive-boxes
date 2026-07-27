import { useRef } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, PerspectiveCamera, Grid } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { ScanMesh } from './ScanMesh';
import { FurnitureMesh } from './FurnitureMesh';
import { RoomDimensions } from './RoomDimensions';
import { useLayoutStore } from '../store/layoutStore';
import { useBoundsStore } from '../store/boundsStore';
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
      <planeGeometry args={[500, 500]} />
      <meshBasicMaterial />
    </mesh>
  );
}

/**
 * Frames the camera to the loaded scan's actual bounding box instead of a
 * fixed distance/zoom, since real scans range from tiny nooks to whole floors.
 */
function CameraRig({
  mode,
  enabled,
  controlsRef,
}: {
  mode: ViewMode;
  enabled: boolean;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const bounds = useBoundsStore((s) => s.bounds);
  const { size } = useThree();

  const horizontal = Math.max(bounds?.sizeX ?? 4, bounds?.sizeZ ?? 4, 0.5);
  const vertical = Math.max(bounds?.sizeY ?? 2.5, 0.5);
  const targetY = vertical / 2;

  if (mode === '3d') {
    const radius = Math.sqrt(horizontal ** 2 + vertical ** 2) / 2;
    const fov = 50;
    const dist = (radius / Math.sin(THREE.MathUtils.degToRad(fov / 2))) * 1.25;

    // Fixed viewing angle rather than height scaled off the room's overall
    // diagonal — for a room that's wide but short (e.g. an attic with a
    // large footprint and a low sloped ceiling), scaling height off the
    // diagonal put the camera above the roofline entirely, looking straight
    // down onto the exterior instead of into the room.
    const azimuth = THREE.MathUtils.degToRad(40);
    const elevation = THREE.MathUtils.degToRad(28);
    const dirX = Math.cos(elevation) * Math.sin(azimuth);
    const dirY = Math.sin(elevation);
    const dirZ = Math.cos(elevation) * Math.cos(azimuth);

    return (
      <>
        <PerspectiveCamera
          makeDefault
          position={[dirX * dist, targetY + dirY * dist, dirZ * dist]}
          fov={fov}
        />
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enabled={enabled}
          enableRotate
          target={[0, targetY, 0]}
          minDistance={0.3}
          maxDistance={dist * 5}
        />
      </>
    );
  }

  const padding = 1.3;
  const zoom = Math.min(size.width, size.height) / (horizontal * padding);
  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[0, Math.max(horizontal, vertical) * 2 + 5, 0]}
        zoom={zoom}
        up={[0, 0, -1]}
        near={0.1}
        far={2000}
      />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={enabled}
        enableRotate={false}
        target={[0, 0, 0]}
      />
    </>
  );
}

export function SceneCanvas({
  scan,
  mode,
  showDimensions,
  showRoomDimensions,
}: {
  scan: Scan;
  mode: ViewMode;
  showDimensions: boolean;
  showRoomDimensions: boolean;
}) {
  const furniture = useLayoutStore((s) => s.furniture);
  const select = useLayoutStore((s) => s.select);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const draggingId = useLayoutStore((s) => s.draggingId);

  return (
    <Canvas shadows onPointerMissed={() => select(null)}>
      <CameraRig mode={mode} enabled={!draggingId} controlsRef={controlsRef} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <Grid args={[200, 200]} cellColor="#888" sectionColor="#555" fadeDistance={80} position={[0, 0, 0]} />
      <DragPlane />
      <ScanMesh scan={scan} />
      {showRoomDimensions && <RoomDimensions mode={mode} scan={scan} />}
      {furniture.map((item) => (
        <FurnitureMesh key={item.id} item={item} mode={mode} showDimensions={showDimensions} />
      ))}
    </Canvas>
  );
}
