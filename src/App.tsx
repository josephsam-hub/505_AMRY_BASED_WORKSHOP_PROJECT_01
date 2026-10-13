import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import TankFleet from './pages/admin/TankFleet';
import TankDetail from './pages/admin/TankDetail';
import Pert from './pages/admin/Pert';
import ProductionPlan from './pages/admin/ProductionPlan';
import Bays from './pages/admin/Bays';
import Manpower from './pages/admin/Manpower';
import Inspections from './pages/admin/Inspections';
import Defects from './pages/admin/Defects';
import RoadTrials from './pages/admin/RoadTrials';
import JriHandover from './pages/admin/JriHandover';
import Reports from './pages/admin/Reports';
import Administration from './pages/admin/Administration';
import WorkshopFloor from './pages/admin/WorkshopFloor';
import DataQuality from './pages/admin/DataQuality';

// User workspace pages
import UserDashboard from './pages/workspace/Dashboard';
import {
  MyTanks, Tasks, ProcessUpdates,
  UserInspections, UserDefects, UserNotifications, UserReports,
} from './pages/workspace/WorkspacePages';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/admin" replace />} />

          {/* Admin routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/tanks" element={<TankFleet />} />
          <Route path="/admin/tanks/:id" element={<TankDetail />} />
          <Route path="/admin/production-plan" element={<ProductionPlan />} />
          <Route path="/admin/pert" element={<Pert />} />
          <Route path="/admin/bays" element={<Bays />} />
          <Route path="/admin/workshop-floor" element={<WorkshopFloor />} />
          <Route path="/admin/manpower" element={<Manpower />} />
          <Route path="/admin/inspections" element={<Inspections />} />
          <Route path="/admin/defects" element={<Defects />} />
          <Route path="/admin/road-trials" element={<RoadTrials />} />
          <Route path="/admin/jri-handover" element={<JriHandover />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/data-quality" element={<DataQuality />} />
          <Route path="/admin/settings" element={<Administration />} />

          {/* User workspace routes */}
          <Route path="/workspace" element={<UserDashboard />} />
          <Route path="/workspace/tanks" element={<MyTanks />} />
          <Route path="/workspace/tasks" element={<Tasks />} />
          <Route path="/workspace/process-updates" element={<ProcessUpdates />} />
          <Route path="/workspace/processes" element={<Navigate to="/workspace/process-updates" replace />} />
          <Route path="/workspace/updates" element={<Navigate to="/workspace/process-updates" replace />} />
          <Route path="/workspace/inspections" element={<UserInspections />} />
          <Route path="/workspace/defects" element={<UserDefects />} />
          <Route path="/workspace/notifications" element={<UserNotifications />} />
          <Route path="/workspace/reports" element={<UserReports />} />

          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
