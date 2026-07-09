export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const API_BASE = (import.meta.env.VITE_API_URL || "https://backend-alpha-ten-24.vercel.app/api/v1").replace(/\/$/, "");

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem("accessToken");
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem("accessToken", token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }

  private async request<T>(
    method: string,
    endpoint: string,
    options?: { body?: any; params?: Record<string, string> }
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${API_BASE}${endpoint}`);
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) url.searchParams.append(key, value);
      });
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 401) {
      this.clearToken();
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Request failed: ${response.status}`);
    }
    return data;
  }

  get<T>(endpoint: string, params?: Record<string, string>) {
    return this.request<T>("GET", endpoint, { params });
  }

  post<T>(endpoint: string, body?: any) {
    return this.request<T>("POST", endpoint, { body });
  }

  put<T>(endpoint: string, body?: any) {
    return this.request<T>("PUT", endpoint, { body });
  }

  patch<T>(endpoint: string, body?: any) {
    return this.request<T>("PATCH", endpoint, { body });
  }

  delete<T>(endpoint: string) {
    return this.request<T>("DELETE", endpoint);
  }
}

export const apiClient = new ApiClient();
