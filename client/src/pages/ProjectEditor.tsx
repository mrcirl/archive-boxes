import { useEffect, useState } from 'react';
import { projectsApi, scansApi } from '../api';
import type { Project, Scan } from '../types';
import { useLayoutStore } from '../store/layoutStore';
import { SceneCanvas } from '../components/SceneCanvas';
import { FurniturePalette } from '../components/FurniturePalette';
import { ItemPropertiesPanel } from '../components/ItemPropertiesPanel';
import { Toolbar, type ViewMode } from '../components/Toolbar';

export function ProjectEditor({
  projectId,
  navigate,
}: {
  projectId: string;
  navigate: (path: string) => void;
}) {
  const [project, setProject] = useState<Project | null>(null);
  const [scan, setScan] = useState<Scan | null>(null);
  const [mode, setMode] = useState<ViewMode>('3d');
  const [showDimensions, setShowDimensions] = useState(false);
  const [showRoomDimensions, setShowRoomDimensions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useLayoutStore((s) => s.load);
  const furniture = useLayoutStore((s) => s.furniture);
  const customItems = useLayoutStore((s) => s.customItems);
  const markSaved = useLayoutStore((s) => s.markSaved);

  useEffect(() => {
    let cancelled = false;
    projectsApi
      .get(projectId)
      .then(async (p) => {
        if (cancelled) return;
        setProject(p);
        load(p.furniture, p.customItems);
        const s = await scansApi.get(p.scan_id);
        if (!cancelled) setScan(s);
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [projectId, load]);

  const handleSave = async () => {
    if (!project) return;
    setSaving(true);
    try {
      await projectsApi.update(project.id, { furniture, customItems });
      markSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="page">
        <div className="error-banner">{error}</div>
        <button onClick={() => navigate('/')}>Back to dashboard</button>
      </div>
    );
  }

  if (!project || !scan) return <div className="page">Loading project…</div>;

  return (
    <div className="editor-page">
      <div className="editor-header">
        <button onClick={() => navigate('/')}>← Dashboard</button>
        <h1>{project.name}</h1>
      </div>
      <Toolbar
        mode={mode}
        onModeChange={setMode}
        onSave={handleSave}
        saving={saving}
        showDimensions={showDimensions}
        onToggleDimensions={() => setShowDimensions((v) => !v)}
        showRoomDimensions={showRoomDimensions}
        onToggleRoomDimensions={() => setShowRoomDimensions((v) => !v)}
      />
      <div className="editor-body">
        <FurniturePalette />
        <div className="canvas-wrap">
          <SceneCanvas
            scan={scan}
            mode={mode}
            showDimensions={showDimensions}
            showRoomDimensions={showRoomDimensions}
          />
          <ItemPropertiesPanel />
        </div>
      </div>
    </div>
  );
}
