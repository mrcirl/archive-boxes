import './App.css';
import { useRouter } from './useRouter';
import { Dashboard } from './pages/Dashboard';
import { UploadScan } from './pages/UploadScan';
import { ProjectEditor } from './pages/ProjectEditor';

function App() {
  const { route, navigate } = useRouter();

  return (
    <div className="app-shell">
      {route.name === 'dashboard' && <Dashboard navigate={navigate} />}
      {route.name === 'upload' && <UploadScan navigate={navigate} />}
      {route.name === 'project' && <ProjectEditor projectId={route.id} navigate={navigate} />}
    </div>
  );
}

export default App;
