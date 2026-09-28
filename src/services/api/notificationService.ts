import type { Notification } from '../../models';
import { apiRequest } from './client';

export const notificationService = {
  getNotifications: () => apiRequest<Notification[]>('/api/notifications'),
  markRead: (id: string) => apiRequest<Notification>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => apiRequest<void>('/api/notifications/read-all', { method: 'PATCH' }),
};
