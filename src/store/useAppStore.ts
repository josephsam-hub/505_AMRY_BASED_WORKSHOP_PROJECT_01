import { create } from 'zustand';
import type { DefectStatus, InspectionStatus, Notification, ProcessUpdate } from '../models';
import { notificationService } from '../services/api/notificationService';

type Role = 'admin' | 'user';

interface AppState {
  role: Role;
  setRole: (role: Role) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  notifications: Notification[];
  loadNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  processUpdates: ProcessUpdate[];
  tankProgress: Record<string, number>;
  addProcessUpdate: (update: ProcessUpdate) => void;
  inspectionStatuses: Record<string, InspectionStatus>;
  updateInspectionStatus: (id: string, status: InspectionStatus) => void;
  defectStatuses: Record<string, DefectStatus>;
  updateDefectStatus: (id: string, status: DefectStatus, remarks?: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  role: 'admin',
  setRole: (role) => set({ role }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  notifications: [],
  loadNotifications: async () => {
    const notifications = await notificationService.getNotifications();
    set({ notifications });
  },
  markNotificationRead: (id) => {
    void notificationService.markRead(id).then((notification) => {
      if (notification) set((s) => ({ notifications: s.notifications.map((item) => item.id === id ? notification : item) }));
    });
  },
  markAllRead: () => {
    void notificationService.markAllRead().then(() => {
      set((s) => ({ notifications: s.notifications.map((notification) => ({ ...notification, read: true })) }));
    });
  },
  processUpdates: [],
  tankProgress: {},
  addProcessUpdate: (update) => set((s) => ({
    processUpdates: [update, ...s.processUpdates],
    tankProgress: { ...s.tankProgress, [update.tankId]: update.progress },
  })),
  inspectionStatuses: {},
  updateInspectionStatus: (id, status) => set((s) => ({
    inspectionStatuses: { ...s.inspectionStatuses, [id]: status },
  })),
  defectStatuses: {},
  updateDefectStatus: (id, status, remarks) => set((s) => ({
    defectStatuses: { ...s.defectStatuses, [id]: status },
    processUpdates: remarks
      ? s.processUpdates.map((update) => update.id === id ? { ...update, remarks } : update)
      : s.processUpdates,
  })),
}));
