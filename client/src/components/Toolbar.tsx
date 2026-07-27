import { useLayoutStore } from '../store/layoutStore';

export type ViewMode = '3d' | '2d';

interface ToolbarProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  onSave: () => void;
  saving: boolean;
}

export function Toolbar({ mode, onModeChange, onSave, saving }: ToolbarProps) {
  const dirty = useLayoutStore((s) => s.dirty);
  const selectedId = useLayoutStore((s) => s.selectedId);
  const rotateItem = useLayoutStore((s) => s.rotateItem);
  const removeItem = useLayoutStore((s) => s.removeItem);

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button className={mode === '3d' ? 'active' : ''} onClick={() => onModeChange('3d')}>
          3D View
        </button>
        <button className={mode === '2d' ? 'active' : ''} onClick={() => onModeChange('2d')}>
          2D Floor Plan
        </button>
      </div>

      <div className="toolbar-group">
        <button disabled={!selectedId} onClick={() => selectedId && rotateItem(selectedId, -Math.PI / 8)}>
          ⟲ Rotate
        </button>
        <button disabled={!selectedId} onClick={() => selectedId && rotateItem(selectedId, Math.PI / 8)}>
          Rotate ⟳
        </button>
        <button disabled={!selectedId} onClick={() => selectedId && removeItem(selectedId)}>
          Delete
        </button>
      </div>

      <div className="toolbar-group">
        <button className="save-btn" onClick={onSave} disabled={saving || !dirty}>
          {saving ? 'Saving…' : dirty ? 'Save layout' : 'Saved'}
        </button>
      </div>
    </div>
  );
}
