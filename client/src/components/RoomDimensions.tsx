import { Html, Line } from '@react-three/drei';
import { useBoundsStore } from '../store/boundsStore';
import type { Scan } from '../types';
import type { ViewMode } from './Toolbar';

const TICK = 0.15;
const MARGIN = 0.3;
const LINE_COLOR = '#7fb3ff';
const WALL_LABEL_OFFSET = 0.3;

function DimensionLine({ points }: { points: [number, number, number][] }) {
  return <Line points={points} color={LINE_COLOR} lineWidth={1.5} />;
}

/** Rooms created via "Draw a room" know their exact wall polygon — parsed
 * here and re-centered to match how <Center> repositions the rendered scan
 * (same bounding-box-center math), so labels land exactly on the real walls
 * instead of needing a second, possibly-offset source of truth. */
function getWallSegments(scan: Scan) {
  if (!scan.wall_points_json) return null;
  try {
    const raw: { x: number; z: number }[] = JSON.parse(scan.wall_points_json);
    if (!Array.isArray(raw) || raw.length < 3) return null;
    const xs = raw.map((p) => p.x);
    const zs = raw.map((p) => p.z);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    const points = raw.map((p) => ({ x: p.x - cx, z: p.z - cz }));

    return points.map((a, i) => {
      const b = points[(i + 1) % points.length];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.hypot(dx, dz);
      const midX = (a.x + b.x) / 2;
      const midZ = (a.z + b.z) / 2;
      // Outward normal (opposite of the inward one used to build the wall mesh).
      const nx = dz / (length || 1);
      const nz = -dx / (length || 1);
      return { length, midX, midZ, nx, nz };
    });
  } catch {
    return null;
  }
}

function WallLengthLabels({
  segments,
  mode,
  wallHeightM,
}: {
  segments: NonNullable<ReturnType<typeof getWallSegments>>;
  mode: ViewMode;
  wallHeightM: number;
}) {
  return (
    <>
      {segments.map((seg, i) => {
        const labelX = seg.midX + seg.nx * WALL_LABEL_OFFSET;
        const labelZ = seg.midZ + seg.nz * WALL_LABEL_OFFSET;
        const y = mode === '3d' ? wallHeightM / 2 : 0.05;
        return (
          <Html key={i} position={[labelX, y, labelZ]} center zIndexRange={[0, 0]}>
            <div className="dimension-label wall-label">{seg.length.toFixed(2)} m</div>
          </Html>
        );
      })}
    </>
  );
}

/** Overall scanned-room size, toggled independently of per-item dimensions.
 * Rooms created via "Draw a room" know their exact wall polygon, so real
 * per-wall length labels are shown (WallLengthLabels) instead of the
 * generic axis-aligned bounding-box measurement — for a rotated/irregular
 * room those two would disagree and drawing both would just duplicate
 * (and for a plain rectangle, exactly overlap) the same information. Scans
 * without known wall geometry (uploads, USDZ conversions) fall back to the
 * bounding-box-only display, clearly labeled as such since it isn't the
 * real footprint or individual wall lengths. */
export function RoomDimensions({ mode, scan }: { mode: ViewMode; scan: Scan }) {
  const bounds = useBoundsStore((s) => s.bounds);
  if (!bounds) return null;

  const { sizeX, sizeY, sizeZ } = bounds;
  const wallSegments = getWallSegments(scan);
  const m = (v: number) => v.toFixed(2);
  const labelPos: [number, number, number] =
    mode === '3d' ? [0, sizeY + 0.3, 0] : [0, 0.05, -sizeZ / 2 - MARGIN - 0.55];

  return (
    <>
      <Html position={labelPos} center zIndexRange={[0, 0]}>
        <div className="room-dimension-label">
          {wallSegments ? 'Room' : 'Room (bounding box)'}: {m(sizeX)} × {m(sizeZ)} × {m(sizeY)} m
        </div>
      </Html>

      {wallSegments ? (
        <WallLengthLabels segments={wallSegments} mode={mode} wallHeightM={scan.wall_height_m ?? sizeY} />
      ) : (
        mode === '2d' && (
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
        )
      )}
    </>
  );
}
