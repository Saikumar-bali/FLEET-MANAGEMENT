const API_BASE_URL = '/api/v1';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

export async function getHealth() {
  return request<{ status: string; timestamp: string; uptime: number; database: string }>('/health');
}

export const api = { getHealth };
