import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Gauge, Layers, GitBranch, Building2,
  Users, ClipboardCheck, AlertTriangle, Car, FileCheck,
  BarChart3, Settings, ChevronLeft, ChevronRight, Database,
  ListTodo, RefreshCw, Bell, FileText, Crosshair
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const adminNav = [
  { section: 'COMMAND CENTER' },
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/production-plan', label: 'Production Plan', icon: Gauge },
  { to: '/admin/tanks', label: 'Tank Fleet', icon: Crosshair },
  { to: '/admin/pert', label: 'PERT / Workflow', icon: GitBranch },
  { section: 'OPERATIONS' },
  { to: '/admin/bays', label: 'Bays', icon: Building2 },
  { to: '/admin/manpower', label: 'Manpower & Gangs', icon: Users },
  { to: '/admin/inspections', label: 'Inspections', icon: ClipboardCheck },
  { to: '/admin/defects', label: 'Defects', icon: AlertTriangle },
  { to: '/admin/road-trials', label: 'Road Trials', icon: Car },
  { to: '/admin/jri-handover', label: 'JRI & Handover', icon: FileCheck },
  { section: 'MANAGEMENT' },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/data-quality', label: 'Data Quality', icon: Database },
  { to: '/admin/settings', label: 'Administration', icon: Settings },
];

const userNav = [
  { section: 'MY WORKSPACE' },
  { to: '/workspace', label: 'My Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/workspace/tanks', label: 'My Tanks', icon: Crosshair },
  { to: '/workspace/tasks', label: "Today's Tasks", icon: ListTodo },
  { to: '/workspace/process-updates', label: 'Process Updates', icon: RefreshCw },
  { section: 'QUALITY' },
  { to: '/workspace/inspections', label: 'Inspections', icon: ClipboardCheck },
  { to: '/workspace/defects', label: 'Defects', icon: AlertTriangle },
  { section: 'COMMUNICATIONS' },
  { to: '/workspace/notifications', label: 'Notifications', icon: Bell },
  { to: '/workspace/reports', label: 'My Reports', icon: FileText },
];

export function Sidebar() {
  const { role, sidebarCollapsed, toggleSidebar } = useAppStore();
  const location = useLocation();
  const nav = role === 'admin' ? adminNav : userNav;

  return (
    <aside
      className={`flex flex-col bg-surface-1 border-r border-border transition-all duration-slow flex-shrink-0 ${sidebarCollapsed ? 'w-14' : 'w-56'}`}
    >
      {/* Logo / Brand */}
      <div className={`flex items-center border-b border-border h-14 flex-shrink-0 ${sidebarCollapsed ? 'justify-center px-0' : 'px-4 gap-3'}`}>
        <div className="w-7 h-7 bg-accent rounded flex items-center justify-center flex-shrink-0">
          <Layers size={14} className="text-white" />
        </div>
        {!sidebarCollapsed && (
          <div>
            <div className="text-xs font-bold text-text-primary tracking-tight leading-tight">505 BASE</div>
            <div className="text-2xs text-text-tertiary tracking-wider">WORKSHOP</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {nav.map((item, i) => {
          if ('section' in item) {
            if (sidebarCollapsed) return <div key={i} className="my-2 border-t border-border" />;
            return <div key={i} className="section-label mt-3 first:mt-1">{item.section}</div>;
          }

          const Icon = item.icon;
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`${isActive ? 'nav-item-active' : 'nav-item'} ${sidebarCollapsed ? 'justify-center px-0 py-2' : ''}`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon size={15} className="flex-shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center h-10 border-t border-border text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors duration-fast"
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
