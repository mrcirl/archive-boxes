import { useMemo, useRef } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, PerspectiveCamera, Grid } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { ScanMesh } from './ScanMesh';
import { FurnitureMesh } from './FurnitureMesh';
import { RoomDimensions } from './RoomDimensions';
import { useLayoutStore } from '../store/layoutStore';
import { useBoundsStore } from '../store/boundsStore';
import { resolveInstanceDef } from '../furniture/catalog';
import { getRoomPolygonPoints, boundsRectangle, footprintCorners, isPointInPolygon } from '../geometry/roomPolygon';
import type { Point2D } from '../geometry/roomMesh';
import type { Scan } from '../types';
import type { ViewMode } from './Toolbar';

function DragPlane({ boundary }: { boundary: Point2D[] | null }) {
  const draggingId = useLayoutStore((s) => s.draggingId);
  const furniture = useLayoutStore((s) => s.furniture);
  const customItems = useLayoutStore((s) => s.customItems);
  const setPosition = useLayoutStore((s) => s.setPosition);
  const setDragging = useLayoutStore((s) => s.setDragging);

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!draggingId) return;
    e.stopPropagation();

    const item = furniture.find((f) => f.id === draggingId);
    // No boundary data yet, or a wall-mounted/floating item (height off
    // floor > 0) — those are explicitly meant to sit at/through a wall
    // plane, so floor-level wall collision doesn't apply to them.
    if (!item || !boundary || (item.y ?? 0) > 0) {
      setPosition(draggingId, e.point.x, e.point.z);
      return;
    }

    const def = resolveInstanceDef(item, customItems);
    const corners = footprintCorners(e.point.x, e.point.z, def.widthM, def.depthM, item.rotationY);
    const fits = corners.every((c) => isPointInPolygon(c, boundary));
    if (fits) setPosition(draggingId, e.point.x, e.point.z);
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
 * Invisible plane used while dragging an item's vertical (Y) handle. It's
 * oriented to always face the camera around the world Y axis — a billboard
 * containing the Y axis at the dragged item's (x, z) — so the intersection
 * point's world-space Y directly gives the item's new height off the floor,
 * regardless of the current orbit angle.
 */
function VerticalDragPlane() {
  const verticalDraggingId = useLayoutStore((s) => s.verticalDraggingId);
  const furniture = useLayoutStore((s) => s.furniture);
  const setHeight = useLayoutStore((s) => s.setHeight);
  const setVerticalDragging = useLayoutStore((s) => s.setVerticalDragging);
  const { camera } = useThree();

  const item = verticalDraggingId ? furniture.find((f) => f.id === verticalDraggingId) : null;

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!verticalDraggingId) return;
    e.stopPropagation();
    setHeight(verticalDraggingId, e.point.y);
  };

  const onPointerUp = () => {
    if (verticalDraggingId) setVerticalDragging(null);
  };

  if (!item) return null;

  const angle = Math.atan2(camera.position.x - item.x, camera.position.z - item.z);

  return (
    <mesh
      position={[item.x, 0, item.z]}
      rotation={[0, angle, 0]}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      visible={false}
    >
      <planeGeometry args={[50, 50]} />
      <meshBasicMaterial side={THREE.DoubleSide} />
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
  const verticalDraggingId = useLayoutStore((s) => s.verticalDraggingId);
  const bounds = useBoundsStore((s) => s.bounds);

  // Prefer the room's exact wall polygon (drawn rooms); fall back to its
  // overall bounding box for scans without known wall geometry — either
  // way furniture dragging gets a real boundary to respect.
  const boundary = useMemo(() => {
    const exact = getRoomPolygonPoints(scan);
    if (exact) return exact;
    if (bounds) return boundsRectangle(bounds.sizeX, bounds.sizeZ);
    return null;
  }, [scan, bounds]);

  return (
    <Canvas shadows onPointerMissed={() => select(null)}>
      <CameraRig mode={mode} enabled={!draggingId && !verticalDraggingId} controlsRef={controlsRef} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <Grid args={[200, 200]} cellColor="#888" sectionColor="#555" fadeDistance={80} position={[0, 0, 0]} />
      <DragPlane boundary={boundary} />
      <VerticalDragPlane />
      <ScanMesh scan={scan} />
      {showRoomDimensions && <RoomDimensions mode={mode} scan={scan} />}
      {furniture.map((item) => (
        <FurnitureMesh key={item.id} item={item} mode={mode} showDimensions={showDimensions} />
      ))}
    </Canvas>
  );
}
