import { useRef, useState } from 'react';

const DRAG_THRESHOLD_PX = 3;
const CM_PER_PIXEL = 0.5;

/** A cm-valued number field that can be typed into directly, or
 * click-and-dragged left/right to scrub the value (Figma/Blender-style) —
 * a plain click (no movement) focuses it for typing instead. Internally
 * works in meters, since that's the unit the rest of the app stores. */
export function ScrubInput({
  label,
  valueM,
  onChangeM,
  min,
}: {
  label: string;
  valueM: number;
  onChangeM: (m: number) => void;
  min?: number;
}) {
  const [dragging, setDragging] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragStart = useRef<{ x: number; valueM: number } | null>(null);
  const moved = useRef(false);

  const displayCm = Math.round(valueM * 100);

  const commit = (cm: number) => {
    const m = cm / 100;
    onChangeM(min !== undefined ? Math.max(min, m) : m);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragStart.current = { x: e.clientX, valueM };
    moved.current = false;

    const onMove = (ev: MouseEvent) => {
      if (!dragStart.current) return;
      const dx = ev.clientX - dragStart.current.x;
      if (Math.abs(dx) > DRAG_THRESHOLD_PX) {
        moved.current = true;
        setDragging(true);
      }
      if (moved.current) {
        const nextM = dragStart.current.valueM + (dx * CM_PER_PIXEL) / 100;
        commit(Math.round(nextM * 100));
      }
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      setDragging(false);
      if (!moved.current) {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      dragStart.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <label className="prop-field">
      <span>{label}</span>
      <div
        className={`prop-input-wrap scrub${dragging ? ' dragging' : ''}`}
        onMouseDown={handleMouseDown}
        title="Drag to adjust, or click to type a value"
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={draft ?? String(displayCm)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== null) {
              const n = parseFloat(draft);
              if (Number.isFinite(n)) commit(n);
            }
            setDraft(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') inputRef.current?.blur();
          }}
        />
        <span className="unit">cm</span>
      </div>
    </label>
  );
}
