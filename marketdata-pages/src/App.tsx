import { Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from './components/Layout';
import { ArchitecturePage } from './routes/Architecture';
import { ArtifactsPage } from './routes/Artifacts';
import { CorrectnessPage } from './routes/Correctness';
import { HomePage } from './routes/Home';
import { PerformancePage } from './routes/Performance';
import { ReplayPage } from './routes/Replay';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/replay" element={<ReplayPage />} />
        <Route path="/performance" element={<PerformancePage />} />
        <Route path="/correctness" element={<CorrectnessPage />} />
        <Route path="/architecture" element={<ArchitecturePage />} />
        <Route path="/artifacts" element={<ArtifactsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
