import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { CommandHeader } from './CommandHeader';
import { RealtimeProvider } from './RealtimeProvider';
import { DataModeBanner } from './DataModeBanner';
import { CommandPalette } from './CommandPalette';
import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';

export function AppShell() {
  const loadNotifications = useAppStore((state) => state.loadNotifications);

  useEffect(() => {
    void loadNotifications().catch(() => undefined);
  }, [loadNotifications]);

  return (
    <RealtimeProvider>
      <CommandPalette />
      <div className="flex h-screen overflow-hidden bg-base-800">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <DataModeBanner />
          <CommandHeader />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </RealtimeProvider>
  );
}
