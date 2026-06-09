import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import * as api from '../services/api';
import { clearStoredSession, readStoredSession, writeStoredSession } from '../services/authStorage';
import type { AuthPayload, AuthState } from '../types/auth';
import { ApiError } from '../types/api';

type AuthContextValue = AuthState & {
  isBootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function applyAuthPayload(payload: AuthPayload): AuthState {
  return {
    user: payload.user,
    permissions: payload.permissions,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
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
      const storedSession = readStoredSession();

      if (!storedSession) {
        setIsBootstrapping(false);
        return;
      }

      try {
        const meResponse = await api.getCurrentUser(storedSession.accessToken);
        setState({
          user: meResponse.data.user,
          permissions: meResponse.data.permissions,
          accessToken: storedSession.accessToken,
          refreshToken: storedSession.refreshToken,
        });
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 401) {
          try {
            const refreshResponse = await api.refresh(storedSession.refreshToken);
            const nextState = applyAuthPayload(refreshResponse.data);
            writeStoredSession({
              accessToken: nextState.accessToken!,
              refreshToken: nextState.refreshToken!,
            });
            setState(nextState);
          } catch {
            clearStoredSession();
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
    async login(email: string, password: string) {
      const response = await api.login(email, password);
      const nextState = applyAuthPayload(response.data);
      writeStoredSession({
        accessToken: nextState.accessToken!,
        refreshToken: nextState.refreshToken!,
      });
      setState(nextState);
    },
    async logout() {
      if (state.refreshToken) {
        try {
          await api.logout(state.refreshToken);
        } catch {
          // Intentionally ignore logout failures to guarantee local sign-out.
        }
      }

      clearStoredSession();
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
