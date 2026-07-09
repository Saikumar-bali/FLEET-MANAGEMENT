import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { apiClient } from "../api/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

interface User {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  status: string;
  role: { id: string; name: string; key: string; status: string };
}

interface AuthContextType {
  user: User | null;
  permissions: string[];
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<string[]>([]);

  const { data: meData, isLoading, refetch } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await apiClient.get("/auth/me");
      return res.data;
    },
    retry: false,
    enabled: !!localStorage.getItem("accessToken"),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { identifier: string; password: string }) => {
      const res = await apiClient.post("/auth/login", credentials);
      return res.data;
    },
  });

  const login = async (identifier: string, password: string) => {
    const data = await loginMutation.mutateAsync({ identifier, password });
    apiClient.setToken(data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    setPermissions(data.permissions || []);
    await refetch();
    toast.success(`Welcome back, ${data.user.name}!`);
  };

  const logout = () => {
    apiClient.clearToken();
    setPermissions([]);
    toast.success("Logged out successfully");
    window.location.href = "/login";
  };

  useEffect(() => {
    if (meData?.permissions) {
      setPermissions(meData.permissions);
    }
  }, [meData]);

  return (
    <AuthContext.Provider
      value={{
        user: meData?.user || null,
        permissions,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
