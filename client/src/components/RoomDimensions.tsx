import { Html, Line } from '@react-three/drei';
import { useBoundsStore } from '../store/boundsStore';
import type { ViewMode } from './Toolbar';

const TICK = 0.15;
const MARGIN = 0.3;
const LINE_COLOR = '#7fb3ff';

function DimensionLine({ points }: { points: [number, number, number][] }) {
  return <Line points={points} color={LINE_COLOR} lineWidth={1.5} />;
}

/** Overall scanned-room size (its axis-aligned bounding box), toggled
 * independently of per-item dimensions. In 2D this also draws measured
 * edges along two sides of the bounding box. For a rotated or irregular
 * room (most real scans aren't simple rectangles) the box is bigger than
 * the actual walls, so it's always labeled as a bounding box rather than
 * implying it's the exact footprint or individual wall lengths. */
export function RoomDimensions({ mode }: { mode: ViewMode }) {
  const bounds = useBoundsStore((s) => s.bounds);
  if (!bounds) return null;

  const { sizeX, sizeY, sizeZ } = bounds;
  const m = (v: number) => v.toFixed(2);
  const labelPos: [number, number, number] =
    mode === '3d' ? [0, sizeY + 0.3, 0] : [0, 0.05, -sizeZ / 2 - MARGIN - 0.55];

  return (
    <>
      <Html position={labelPos} center zIndexRange={[0, 0]}>
        <div className="room-dimension-label">
          Room (bounding box): {m(sizeX)} × {m(sizeZ)} × {m(sizeY)} m
        </div>
      </Html>

      {mode === '2d' && (
        <>
          {/* width, along the back edge */}
          <DimensionLine
            points={[
              [-sizeX / 2, 0.02, -sizeZ / 2 - MARGIN],
              [sizeX / 2, 0.02, -sizeZ / 2 - MARGIN],
            ]}
          />
          <DimensionLine
            points={[
              [-sizeX / 2, 0.02, -sizeZ / 2 - MARGIN - TICK / 2],
              [-sizeX / 2, 0.02, -sizeZ / 2 - MARGIN + TICK / 2],
            ]}
          />
          <DimensionLine
            points={[
              [sizeX / 2, 0.02, -sizeZ / 2 - MARGIN - TICK / 2],
              [sizeX / 2, 0.02, -sizeZ / 2 - MARGIN + TICK / 2],
            ]}
          />
          <Html position={[0, 0.02, -sizeZ / 2 - MARGIN - 0.18]} center zIndexRange={[0, 0]}>
            <div className="dimension-label">{m(sizeX)} m</div>
          </Html>

          {/* depth, along the left edge */}
          <DimensionLine
            points={[
              [-sizeX / 2 - MARGIN, 0.02, -sizeZ / 2],
              [-sizeX / 2 - MARGIN, 0.02, sizeZ / 2],
            ]}
          />
          <DimensionLine
            points={[
              [-sizeX / 2 - MARGIN - TICK / 2, 0.02, -sizeZ / 2],
              [-sizeX / 2 - MARGIN + TICK / 2, 0.02, -sizeZ / 2],
            ]}
          />
          <DimensionLine
            points={[
              [-sizeX / 2 - MARGIN - TICK / 2, 0.02, sizeZ / 2],
              [-sizeX / 2 - MARGIN + TICK / 2, 0.02, sizeZ / 2],
            ]}
          />
          <Html position={[-sizeX / 2 - MARGIN - 0.25, 0.02, 0]} center zIndexRange={[0, 0]}>
            <div className="dimension-label">{m(sizeZ)} m</div>
          </Html>
        </>
      )}
    </>
  );
}
