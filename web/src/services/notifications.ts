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

type NotificationListResponse = {
  items: NotificationItem[];
  unreadCount: number;
};

const pendingRequests = new Map<string, Promise<ApiResponse<unknown>>>();

function getRequestKey(endpoint: string, token: string) {
  // Token is intentionally not logged anywhere. The key only lives in memory so
  // duplicate React effects or fast repeated clicks reuse the same request.
  return `${endpoint}:${token}`;
}

async function request<T>(endpoint: string, token: string): Promise<ApiResponse<T>> {
  const requestKey = getRequestKey(endpoint, token);
  const pending = pendingRequests.get(requestKey) as Promise<ApiResponse<T>> | undefined;

  if (pending) {
    return pending;
  }

  const promise = (async () => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || 'Notification request failed');
    return data as ApiResponse<T>;
  })();

  pendingRequests.set(requestKey, promise as Promise<ApiResponse<unknown>>);

  try {
    return await promise;
  } finally {
    pendingRequests.delete(requestKey);
  }
}

export function getMyNotifications(token: string) {
  return request<NotificationListResponse>('/me/notifications', token);
}

export function getMyNotificationCount(token: string) {
  return request<{ unreadCount: number }>('/me/notifications/unread-count', token);
}
