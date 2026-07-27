import { useEffect, useState } from 'react';
import { scansApi, projectsApi } from '../api';
import type { Scan, Project } from '../types';

export function Dashboard({ navigate }: { navigate: (path: string) => void }) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    Promise.all([scansApi.list(), projectsApi.list()])
      .then(([s, p]) => {
        setScans(s);
        setProjects(p);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const startProject = async (scanId: string) => {
    if (!newProjectName.trim()) return;
    try {
      const project = await projectsApi.create(newProjectName.trim(), scanId);
      navigate(`/project/${project.id}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (loading) return <div className="page">Loading…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Office Layouts</h1>
        <button onClick={() => navigate('/upload')}>Upload a 3D scan</button>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <section>
        <h2>Projects</h2>
        {projects.length === 0 && <p className="hint">No layouts yet — upload a scan to get started.</p>}
        <div className="card-grid">
          {projects.map((p) => (
            <button key={p.id} className="card" onClick={() => navigate(`/project/${p.id}`)}>
              <strong>{p.name}</strong>
              <span>{p.furniture.length} items placed</span>
              <span className="muted">Updated {new Date(p.updated_at).toLocaleString()}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Uploaded scans</h2>
        {scans.length === 0 && <p className="hint">No scans uploaded yet.</p>}
        <div className="card-grid">
          {scans.map((s) => (
            <div key={s.id} className="card scan-card">
              <strong>{s.original_name}</strong>
              <span className="muted">
                {s.format.toUpperCase()} · {(s.size_bytes / 1024 / 1024).toFixed(1)} MB
              </span>
              {creatingFor === s.id ? (
                <div className="inline-form">
                  <input
                    autoFocus
                    placeholder="Project name"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && startProject(s.id)}
                  />
                  <button onClick={() => startProject(s.id)}>Create</button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setCreatingFor(s.id);
                    setNewProjectName(`${s.original_name.replace(/\.[^.]+$/, '')} layout`);
                  }}
                >
                  New layout from this scan
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
