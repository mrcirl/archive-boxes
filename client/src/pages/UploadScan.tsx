import { useCallback, useState } from 'react';
import { scansApi } from '../api';

const ACCEPTED = ['.glb', '.gltf', '.obj', '.usdz'];

export function UploadScan({ navigate }: { navigate: (path: string) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
      if (!ACCEPTED.includes(ext)) {
        setError(`Unsupported file type "${ext}". Accepted: ${ACCEPTED.join(', ')}`);
        return;
      }
      setError(null);
      setUploading(true);
      try {
        await scansApi.upload(file);
        navigate('/');
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setUploading(false);
      }
    },
    [navigate]
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Upload a room scan</h1>
        <button onClick={() => navigate('/')}>Back</button>
      </div>

      <div
        className={`dropzone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        {uploading ? (
          <p>Uploading…</p>
        ) : (
          <>
            <p>Drag and drop a scan file here, or</p>
            <label className="file-picker">
              Choose file
              <input
                type="file"
                accept={ACCEPTED.join(',')}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </label>
            <p className="hint">Supported: GLB, GLTF, OBJ, USDZ (up to 200MB)</p>
          </>
        )}
      </div>

      <div className="note-box">
        <strong>About USDZ scans (e.g. Apple RoomPlan / iPhone LiDAR exports):</strong>
        <p>
          USDZ files are converted on upload for preview when they're built from plain-text
          USD (the common case for RoomPlan exports). Some USDZ files use a binary USD format
          that can't be converted — those are still stored and attached to your project, just
          without a live preview. If you hit that, export your scan as <strong>GLB</strong> or{' '}
          <strong>OBJ</strong> instead for a guaranteed full 3D and floor-plan preview.
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
}
