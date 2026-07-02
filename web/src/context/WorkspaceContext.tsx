import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getMyWorkspace } from '../services/api';
import { useAuth } from './AuthContext';
import type { WorkspaceResponse } from '../types/workspace';

type WorkspaceContextValue = {
  workspace: WorkspaceResponse | null;
  isLoading: boolean;
  error: string | null;
  refreshWorkspace: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { accessToken, user } = useAuth();
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshWorkspace = useCallback(async () => {
    if (!accessToken) {
      setWorkspace(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await getMyWorkspace(accessToken);
      setWorkspace(res.data as WorkspaceResponse);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load workspace';
      setError(message);
      setWorkspace(null);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    refreshWorkspace();
  }, [refreshWorkspace, user?.id]);

  return (
    <WorkspaceContext.Provider value={{ workspace, isLoading, error, refreshWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspaceContext must be used within a WorkspaceProvider');
  }
  return ctx;
}
