import { API_BASE_URL } from '../config/api';
import type { ApiResponse } from '../types/api';

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  category: string;
  severity: string;
  actionUrl?: string | null;
  createdAt: string;
  readAt?: string | null;
};

async function request<T>(endpoint: string, token: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || 'Notification request failed');
  return data;
}

export function getMyNotifications(token: string) {
  return request<{ items: NotificationItem[] }>('/me/notifications', token);
}

export function getMyNotificationCount(token: string) {
  return request<{ unreadCount: number }>('/me/notifications/unread-count', token);
}

export function markNotificationRead(token: string, id: string) {
  return request(`/me/notifications/${id}/read`, token, { method: 'POST' });
}

export function markAllNotificationsRead(token: string) {
  return request('/me/notifications/read-all', token, { method: 'POST' });
}
