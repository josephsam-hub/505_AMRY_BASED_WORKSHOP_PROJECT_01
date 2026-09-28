import { Bell, Shield, User, ChevronDown } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { ConnectionStatus } from './ConnectionStatus';

export function CommandHeader() {
  const { role, setRole, notifications } = useAppStore();
  const navigate = useNavigate();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;

  const switchRole = (r: 'admin' | 'user') => {
    setRole(r);
    setShowRoleMenu(false);
    navigate(r === 'admin' ? '/admin' : '/workspace');
  };

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-surface-1 flex-shrink-0">
      {/* Left: context label */}
      <div className="flex items-center gap-3">
        <div className="text-xs text-text-tertiary uppercase tracking-widest">
          {role === 'admin' ? 'Command Center' : 'Workstation'}
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="text-xs text-text-secondary">
          505 Base Workshop — Tank Overhaul Management
        </div>
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2">
        <ConnectionStatus />

        {/* Notification bell */}
        <button
          className="relative btn-ghost px-2 py-1.5"
          title="Notifications"
          onClick={() => navigate(role === 'admin' ? '/admin' : '/workspace/notifications')}
        >
          <Bell size={15} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-status-critical text-white text-2xs rounded-full flex items-center justify-center font-bold">
              {unread}
            </span>
          )}
        </button>

        {/* Role switcher */}
        <div className="relative">
          <button
            className="btn-ghost flex items-center gap-2"
            onClick={() => setShowRoleMenu((v) => !v)}
          >
            {role === 'admin' ? <Shield size={14} className="text-accent" /> : <User size={14} className="text-status-active" />}
            <span className="text-sm font-medium">{role === 'admin' ? 'Admin' : 'User'}</span>
            <ChevronDown size={12} className="text-text-tertiary" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 top-full mt-1 w-44 card-elevated shadow-lg z-50 py-1">
              <button
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-surface-3 transition-colors ${role === 'admin' ? 'text-text-primary' : 'text-text-secondary'}`}
                onClick={() => switchRole('admin')}
              >
                <Shield size={13} className="text-accent" />
                Admin / Command Center
              </button>
              <button
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-surface-3 transition-colors ${role === 'user' ? 'text-text-primary' : 'text-text-secondary'}`}
                onClick={() => switchRole('user')}
              >
                <User size={13} className="text-status-active" />
                User / Workstation
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
