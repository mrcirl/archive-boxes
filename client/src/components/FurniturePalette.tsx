import { FURNITURE_CATALOG } from '../furniture/catalog';
import { useLayoutStore } from '../store/layoutStore';

export function FurniturePalette() {
  const addItem = useLayoutStore((s) => s.addItem);

  return (
    <div className="furniture-palette">
      <h3>Add furniture</h3>
      <div className="furniture-grid">
        {FURNITURE_CATALOG.map((def) => (
          <button key={def.type} className="furniture-item" onClick={() => addItem(def.type)}>
            <span className="swatch" style={{ background: def.color }} />
            {def.label}
          </button>
        ))}
      </div>
      <p className="hint">Click to add, then drag on the scan to position it.</p>
    </div>
  );
}
