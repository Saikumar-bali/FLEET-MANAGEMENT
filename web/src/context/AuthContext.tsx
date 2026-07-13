import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import * as api from '../services/api';
import type { AuthPayload, AuthState } from '../types/auth';
import { ApiError } from '../types/api';

const COOKIE_SESSION = 'cookie-session';

type AuthContextValue = AuthState & {
  isBootstrapping: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function applyAuthPayload(payload: AuthPayload): AuthState {
  return {
    user: payload.user,
    permissions: payload.permissions,
    accessToken: COOKIE_SESSION,
    refreshToken: null,
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({
    user: null,
    permissions: [],
    accessToken: null,
    refreshToken: null,
  });
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const meResponse = await api.getCurrentUser(COOKIE_SESSION);
        setState({
          user: meResponse.data.user,
          permissions: meResponse.data.permissions,
          accessToken: COOKIE_SESSION,
          refreshToken: null,
        });
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 401) {
          try {
            const refreshResponse = await api.refresh();
            const nextState = applyAuthPayload(refreshResponse.data);
            setState(nextState);
          } catch {
            setState({
              user: null,
              permissions: [],
              accessToken: null,
              refreshToken: null,
            });
          }
        }
      } finally {
        setIsBootstrapping(false);
      }
    };

    void bootstrap();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    isBootstrapping,
    async login(identifier: string, password: string) {
      const response = await api.login(identifier, password);
      const nextState = applyAuthPayload(response.data);
      setState(nextState);
    },
    async logout() {
      try {
        await api.logout();
      } catch {
        // Intentionally ignore logout failures to guarantee local sign-out.
      }
      setState({
        user: null,
        permissions: [],
        accessToken: null,
        refreshToken: null,
      });
    },
    hasPermission(permission) {
      return state.permissions.includes(permission);
    },
    hasAnyPermission(permissions) {
      if (permissions.length === 0) {
        return true;
      }

      return permissions.some((permission) => state.permissions.includes(permission));
    },
  }), [isBootstrapping, state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
