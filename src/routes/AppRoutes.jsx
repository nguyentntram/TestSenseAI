import { Routes, Route, useParams } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout.jsx'
import LandingPage from '../pages/LandingPage.jsx'
import ProjectsPage from '../pages/ProjectsPage.jsx'
import ConnectRepositoryPage from '../pages/ConnectRepositoryPage.jsx'
import ProjectWorkspacePage from '../pages/ProjectWorkspacePage.jsx'
import PRListPage from '../pages/PRListPage.jsx'
import PRDetailPage from '../pages/PRDetailPage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'

// Remounts ProjectWorkspacePage whenever the projectId param changes, so its
// internal state (active tab, load status) resets without an effect doing it.
function ProjectWorkspaceRoute() {
  const { projectId } = useParams()
  return <ProjectWorkspacePage key={projectId} />
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/connect-repository" element={<ConnectRepositoryPage />} />
        <Route path="/projects/:projectId" element={<ProjectWorkspaceRoute />} />
        <Route path="/projects/:projectId/pull-requests" element={<PRListPage />} />
        <Route path="/projects/:projectId/pull-requests/:prId" element={<PRDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
