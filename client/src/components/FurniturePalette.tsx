import { useState } from 'react';
import { FURNITURE_CATALOG, customItemType } from '../furniture/catalog';
import { useLayoutStore } from '../store/layoutStore';
import { AddCustomItemModal } from './AddCustomItemModal';
import { assetUrl } from '../api';

export function FurniturePalette() {
  const addItem = useLayoutStore((s) => s.addItem);
  const customItems = useLayoutStore((s) => s.customItems);
  const removeCustomItem = useLayoutStore((s) => s.removeCustomItem);
  const [modalOpen, setModalOpen] = useState(false);

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

      {customItems.length > 0 && (
        <>
          <h3>Your items</h3>
          <div className="furniture-grid">
            {customItems.map((item) => (
              <div key={item.id} className="furniture-item-row">
                <button
                  className="furniture-item"
                  onClick={() => addItem(customItemType(item.id))}
                >
                  {item.photoUrl ? (
                    <img className="swatch-photo" src={assetUrl(item.photoUrl)} alt="" />
                  ) : (
                    <span className="swatch" style={{ background: item.color }} />
                  )}
                  {item.name}
                </button>
                <button
                  className="remove-item-btn"
                  title="Remove from palette"
                  onClick={() => removeCustomItem(item.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <button className="new-item-btn" onClick={() => setModalOpen(true)}>
        + New item
      </button>

      <p className="hint">Click to add, then drag on the scan to position it.</p>

      {modalOpen && <AddCustomItemModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
