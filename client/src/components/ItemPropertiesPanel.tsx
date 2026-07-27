import { useLayoutStore } from '../store/layoutStore';
import { resolveInstanceDef } from '../furniture/catalog';
import { ScrubInput } from './ScrubInput';
import type { HollowStyle } from '../types';

/** Edits the selected placed item: position, real W/D/H, and hollow
 * structure. Dimensions are stored as per-instance overrides, so two desks
 * from the same catalog entry can have different sizes. */
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

      <div className="item-props-section-label">Position</div>
      <div className="prop-field-row">
        <ScrubInput label="X" valueM={item.x} onChangeM={(m) => updateItem(item.id, { x: m })} />
        <ScrubInput label="Z" valueM={item.z} onChangeM={(m) => updateItem(item.id, { z: m })} />
      </div>
      <ScrubInput
        label="Height off floor"
        valueM={item.y ?? 0}
        min={0}
        onChangeM={(m) => updateItem(item.id, { y: m })}
      />

      <div className="item-props-section-label">Size</div>
      <ScrubInput label="Width" valueM={def.widthM} min={0.01} onChangeM={(m) => updateItem(item.id, { widthM: m })} />
      <ScrubInput label="Depth" valueM={def.depthM} min={0.01} onChangeM={(m) => updateItem(item.id, { depthM: m })} />
      <ScrubInput label="Height" valueM={def.heightM} min={0.01} onChangeM={(m) => updateItem(item.id, { heightM: m })} />

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
