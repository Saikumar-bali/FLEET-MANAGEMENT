import { useWorkspaceContext } from '../context/WorkspaceContext';

export function useWorkspace() {
  const { workspace, isLoading, error, refreshWorkspace } = useWorkspaceContext();

  return {
    workspace,
    workspaceType: workspace?.workspaceType ?? null,
    capabilities: workspace?.capabilities ?? null,
    navigation: workspace?.navigation ?? [],
    quickActions: workspace?.quickActions ?? [],
    primaryProfiles: workspace?.primaryProfiles ?? null,
    effectivePermissions: workspace?.effectivePermissions ?? [],
    profileLinks: workspace?.profileLinks ?? [],
    dataScopes: workspace?.dataScopes ?? [],
    emptyStates: workspace?.emptyStates ?? [],
    diagnostics: workspace?.diagnostics ?? [],
    user: workspace?.user ?? null,
    isLoading,
    error,
    refreshWorkspace,
  };
}
