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

async function request<T>(endpoint: string, _token: string): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { credentials: 'include' });
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
