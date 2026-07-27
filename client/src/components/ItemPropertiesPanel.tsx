import { useLayoutStore } from '../store/layoutStore';
import { resolveInstanceDef } from '../furniture/catalog';
import type { HollowStyle } from '../types';

function DimensionInput({
  label,
  valueM,
  onChangeM,
}: {
  label: string;
  valueM: number;
  onChangeM: (m: number) => void;
}) {
  return (
    <label className="prop-field">
      <span>{label}</span>
      <div className="prop-input-wrap">
        <input
          type="number"
          min={1}
          step={1}
          value={Math.round(valueM * 100)}
          onChange={(e) => {
            const cm = parseFloat(e.target.value);
            if (Number.isFinite(cm) && cm > 0) onChangeM(cm / 100);
          }}
        />
        <span className="unit">cm</span>
      </div>
    </label>
  );
}

/** Edits the selected placed item: real W/D/H and hollow structure. Stored
 * as per-instance overrides, so two desks from the same catalog entry can
 * have different sizes. */
export function ItemPropertiesPanel() {
  const selectedId = useLayoutStore((s) => s.selectedId);
  const furniture = useLayoutStore((s) => s.furniture);
  const customItems = useLayoutStore((s) => s.customItems);
  const updateItem = useLayoutStore((s) => s.updateItem);

  const item = furniture.find((f) => f.id === selectedId);
  if (!item) return null;

  const def = resolveInstanceDef(item, customItems);

  return (
    <div className="item-props">
      <div className="item-props-title">{def.label}</div>
      <DimensionInput label="Width" valueM={def.widthM} onChangeM={(m) => updateItem(item.id, { widthM: m })} />
      <DimensionInput label="Depth" valueM={def.depthM} onChangeM={(m) => updateItem(item.id, { depthM: m })} />
      <DimensionInput label="Height" valueM={def.heightM} onChangeM={(m) => updateItem(item.id, { heightM: m })} />
      <label className="prop-field">
        <span>Structure</span>
        <select
          value={def.hollow ?? 'none'}
          onChange={(e) => updateItem(item.id, { hollow: e.target.value as HollowStyle })}
        >
          <option value="none">Solid</option>
          <option value="top">Hollow — open top (box/bin)</option>
          <option value="front">Hollow — open front (rack/shelf)</option>
        </select>
      </label>
    </div>
  );
}
