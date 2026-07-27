import { useMemo, useRef, useState } from 'react';
import { scansApi, projectsApi } from '../api';
import { buildRoomGroup, exportGroupToGlb, polygonArea, type Point2D } from '../geometry/roomMesh';

const PX_PER_METER = 40;
const CLOSE_THRESHOLD_PX = 14;
const VIEW_SIZE = 640;
const CENTER = VIEW_SIZE / 2;

function toScreen(p: Point2D): [number, number] {
  return [CENTER + p.x * PX_PER_METER, CENTER + p.z * PX_PER_METER];
}

function toWorld(px: number, py: number): Point2D {
  return { x: (px - CENTER) / PX_PER_METER, z: (py - CENTER) / PX_PER_METER };
}

function distancePx(a: [number, number], b: [number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function DrawRoom({ navigate }: { navigate: (path: string) => void }) {
  const [points, setPoints] = useState<Point2D[]>([]);
  const [closed, setClosed] = useState(false);
  const [cursor, setCursor] = useState<Point2D | null>(null);
  const [wallHeightCm, setWallHeightCm] = useState('240');
  const [roomName, setRoomName] = useState('My Room');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const svgPointFromEvent = (e: React.MouseEvent<SVGSVGElement>): [number, number] => {
    const rect = svgRef.current!.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (closed) return;
    const [px, py] = svgPointFromEvent(e);

    if (points.length >= 3) {
      const first = toScreen(points[0]);
      if (distancePx([px, py], first) <= CLOSE_THRESHOLD_PX) {
        setClosed(true);
        return;
      }
    }
    setPoints((prev) => [...prev, toWorld(px, py)]);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (closed) return;
    const [px, py] = svgPointFromEvent(e);
    setCursor(toWorld(px, py));
  };

  const undoLast = () => {
    setClosed(false);
    setPoints((prev) => prev.slice(0, -1));
  };

  const clearAll = () => {
    setClosed(false);
    setPoints([]);
  };

  const area = useMemo(() => (points.length >= 3 ? polygonArea(points) : 0), [points]);
  const canCreate = closed && area > 0.5 && !creating;

  const segmentLengthLabel = useMemo(() => {
    if (closed || points.length === 0 || !cursor) return null;
    const last = points[points.length - 1];
    const d = Math.hypot(cursor.x - last.x, cursor.z - last.z);
    return `${d.toFixed(2)} m`;
  }, [points, cursor, closed]);

  const handleCreate = async () => {
    setError(null);
    setCreating(true);
    try {
      const wallHeightM = Math.max(0.5, parseFloat(wallHeightCm) / 100 || 2.4);
      const group = buildRoomGroup(points, wallHeightM);
      const blob = await exportGroupToGlb(group);
      const file = new File([blob], `${(roomName || 'Room').replace(/[^\w\- ]+/g, '')}.glb`, {
        type: 'model/gltf-binary',
      });
      const scan = await scansApi.upload(file, { wallPoints: points, wallHeightM });
      const project = await projectsApi.create(roomName || 'New Room', scan.id);
      navigate(`/project/${project.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const screenPoints = points.map(toScreen);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Draw a room</h1>
        <button onClick={() => navigate('/')}>Back</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <p className="hint">
        Click to place each wall corner, working around the room. Click the first point again
        (highlighted) once you have at least 3 corners to close the shape. Each grid square is 1m.
      </p>

      <div className="draw-room-layout">
        <svg
          ref={svgRef}
          width={VIEW_SIZE}
          height={VIEW_SIZE}
          className="draw-room-canvas"
          onClick={handleClick}
          onMouseMove={handleMouseMove}
        >
          <defs>
            <pattern id="grid" width={PX_PER_METER} height={PX_PER_METER} patternUnits="userSpaceOnUse">
              <path
                d={`M ${PX_PER_METER} 0 L 0 0 0 ${PX_PER_METER}`}
                fill="none"
                stroke="#2c2e38"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width={VIEW_SIZE} height={VIEW_SIZE} fill="#14151a" />
          <rect width={VIEW_SIZE} height={VIEW_SIZE} fill="url(#grid)" />

          {closed && screenPoints.length >= 3 && (
            <polygon
              points={screenPoints.map((p) => p.join(',')).join(' ')}
              fill="rgba(125,179,255,0.18)"
              stroke="#7fb3ff"
              strokeWidth={2}
            />
          )}

          {!closed && screenPoints.length > 0 && (
            <polyline
              points={screenPoints.map((p) => p.join(',')).join(' ')}
              fill="none"
              stroke="#7fb3ff"
              strokeWidth={2}
            />
          )}

          {!closed && cursor && points.length > 0 && (
            <line
              x1={screenPoints[screenPoints.length - 1][0]}
              y1={screenPoints[screenPoints.length - 1][1]}
              x2={toScreen(cursor)[0]}
              y2={toScreen(cursor)[1]}
              stroke="#4a5568"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          )}

          {screenPoints.map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={i === 0 && points.length >= 3 && !closed ? 8 : 5}
              fill={i === 0 ? '#4da3ff' : '#e8e8ec'}
              stroke="#0c0d10"
              strokeWidth={1.5}
            />
          ))}
        </svg>

        <div className="draw-room-sidebar">
          <div className="draw-room-info">
            <div>Corners: {points.length}</div>
            {area > 0 && <div>Floor area: {area.toFixed(1)} m²</div>}
            {segmentLengthLabel && <div>Current wall: {segmentLengthLabel}</div>}
          </div>

          <div className="toolbar-group">
            <button onClick={undoLast} disabled={points.length === 0}>
              Undo point
            </button>
            <button onClick={clearAll} disabled={points.length === 0}>
              Clear
            </button>
          </div>

          {closed && (
            <>
              <label className="field">
                <span>Room name</span>
                <input value={roomName} onChange={(e) => setRoomName(e.target.value)} />
              </label>
              <label className="field">
                <span>Wall height (cm)</span>
                <input
                  value={wallHeightCm}
                  onChange={(e) => setWallHeightCm(e.target.value)}
                  inputMode="decimal"
                />
              </label>
              <button className="save-btn" onClick={handleCreate} disabled={!canCreate}>
                {creating ? 'Creating…' : 'Create room'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
