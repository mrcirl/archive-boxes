import { useLayoutStore } from '../store/layoutStore';

export type ViewMode = '3d' | '2d';

interface ToolbarProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  onSave: () => void;
  saving: boolean;
  showDimensions: boolean;
  onToggleDimensions: () => void;
  showRoomDimensions: boolean;
  onToggleRoomDimensions: () => void;
}

export function Toolbar({
  mode,
  onModeChange,
  onSave,
  saving,
  showDimensions,
  onToggleDimensions,
  showRoomDimensions,
  onToggleRoomDimensions,
}: ToolbarProps) {
  const dirty = useLayoutStore((s) => s.dirty);
  const selectedId = useLayoutStore((s) => s.selectedId);
  const furniture = useLayoutStore((s) => s.furniture);
  const rotateItem = useLayoutStore((s) => s.rotateItem);
  const removeItem = useLayoutStore((s) => s.removeItem);
  const toggleLock = useLayoutStore((s) => s.toggleLock);

  const selected = furniture.find((f) => f.id === selectedId);
  const isLocked = selected?.locked ?? false;

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button className={mode === '3d' ? 'active' : ''} onClick={() => onModeChange('3d')}>
          3D View
        </button>
        <button className={mode === '2d' ? 'active' : ''} onClick={() => onModeChange('2d')}>
          2D Floor Plan
        </button>
        <button className={showDimensions ? 'active' : ''} onClick={onToggleDimensions}>
          📏 Dimensions
        </button>
        <button className={showRoomDimensions ? 'active' : ''} onClick={onToggleRoomDimensions}>
          📐 Room size
        </button>
      </div>

      <div className="toolbar-group">
        <button disabled={!selectedId || isLocked} onClick={() => selectedId && rotateItem(selectedId, -Math.PI / 8)}>
          ⟲ Rotate
        </button>
        <button disabled={!selectedId || isLocked} onClick={() => selectedId && rotateItem(selectedId, Math.PI / 8)}>
          Rotate ⟳
        </button>
        <button
          className={isLocked ? 'active' : ''}
          disabled={!selectedId}
          onClick={() => selectedId && toggleLock(selectedId)}
        >
          {isLocked ? '🔒 Locked' : '🔓 Lock to floor'}
        </button>
        <button disabled={!selectedId || isLocked} onClick={() => selectedId && removeItem(selectedId)}>
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
