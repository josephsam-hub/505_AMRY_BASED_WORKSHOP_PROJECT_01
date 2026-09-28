import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import AdminDashboard from './pages/admin/Dashboard';
import TankFleet from './pages/admin/TankFleet';
import TankDetail from './pages/admin/TankDetail';
import ProductionPlan from './pages/admin/ProductionPlan';
import Pert from './pages/admin/Pert';
import Bays from './pages/admin/Bays';
import Manpower from './pages/admin/Manpower';
import Inspections from './pages/admin/Inspections';
import Defects from './pages/admin/Defects';
import RoadTrials from './pages/admin/RoadTrials';
import JriHandover from './pages/admin/JriHandover';
import Reports from './pages/admin/Reports';
import Settings from './pages/admin/Settings';
import DataQuality from './pages/admin/DataQuality';
import UserDashboard from './pages/workspace/Dashboard';
import WorkspaceTanks from './pages/workspace/Tanks';
import WorkspaceTasks from './pages/workspace/Tasks';
import ProcessUpdates from './pages/workspace/ProcessUpdates';
import WorkspaceInspections from './pages/workspace/Inspections';
import WorkspaceDefects from './pages/workspace/Defects';
import WorkspaceNotifications from './pages/workspace/Notifications';
import WorkspaceReports from './pages/workspace/Reports';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          {/* Default redirect */}
          <Route index element={<Navigate to="/admin" replace />} />

          {/* Admin routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/tanks" element={<TankFleet />} />
          <Route path="/admin/tanks/:id" element={<TankDetail />} />
          <Route path="/admin/production-plan" element={<ProductionPlan />} />
          <Route path="/admin/pert" element={<Pert />} />
          <Route path="/admin/bays" element={<Bays />} />
          <Route path="/admin/manpower" element={<Manpower />} />
          <Route path="/admin/inspections" element={<Inspections />} />
          <Route path="/admin/defects" element={<Defects />} />
          <Route path="/admin/road-trials" element={<RoadTrials />} />
          <Route path="/admin/jri-handover" element={<JriHandover />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/data-quality" element={<DataQuality />} />
          <Route path="/admin/settings" element={<Settings />} />

          {/* User workspace routes */}
          <Route path="/workspace" element={<UserDashboard />} />
          <Route path="/workspace/tanks" element={<WorkspaceTanks />} />
          <Route path="/workspace/tasks" element={<WorkspaceTasks />} />
          <Route path="/workspace/process-updates" element={<ProcessUpdates />} />
          <Route path="/workspace/processes" element={<Navigate to="/workspace/process-updates" replace />} />
          <Route path="/workspace/inspections" element={<WorkspaceInspections />} />
          <Route path="/workspace/defects" element={<WorkspaceDefects />} />
          <Route path="/workspace/notifications" element={<WorkspaceNotifications />} />
          <Route path="/workspace/reports" element={<WorkspaceReports />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
