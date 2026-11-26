import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, type ExportTarget, type Providers, type Role, type User, type WorkspaceDetail, type WorkspaceSummary } from './api';

// ── Queries ───────────────────────────────

// resolves to null when logged out instead of throwing, so guards can branch on it
export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: async () => {
    try {
      return (await api.get<{ user: User }>('/auth/me')).user;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null;
      throw e;
    }
  },
  staleTime: 5 * 60_000,
});

export const providersQuery = queryOptions({
  queryKey: ['auth-providers'],
  queryFn: () => api.get<Providers>('/auth/providers'),
  staleTime: Infinity,
});

export const workspacesQuery = queryOptions({
  queryKey: ['workspaces'],
  queryFn: async () => (await api.get<{ workspaces: WorkspaceSummary[] }>('/workspaces')).workspaces,
});

export const workspaceQuery = (id: string) =>
  queryOptions({
    queryKey: ['workspaces', id],
    queryFn: () => api.get<{ workspace: WorkspaceDetail; role: Role }>(`/workspaces/${id}`),
  });

export const exportTargetsQuery = queryOptions({
  queryKey: ['export-targets'],
  queryFn: async () => (await api.get<{ targets: ExportTarget[] }>('/export/targets')).targets,
  staleTime: Infinity,
});

// ── Mutations ─────────────────────────────

export function useAuthMutation(mode: 'login' | 'register') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string; name?: string }) =>
      api.post<{ user: User }>(`/auth/${mode}`, input),
    onSuccess: ({ user }) => {
      qc.clear();
      qc.setQueryData(meQuery.queryKey, user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      qc.clear();
      qc.setQueryData(meQuery.queryKey, null);
    },
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; hasCanvas?: boolean; exportTarget?: string }) =>
      api.post<{ workspace: WorkspaceDetail }>('/workspaces', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: workspacesQuery.queryKey }),
  });
}

export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...changes
    }: {
      id: string;
      name?: string;
      hasCanvas?: boolean;
      exportTarget?: string;
      rotateInvite?: boolean;
    }) => api.patch<{ workspace: WorkspaceDetail }>(`/workspaces/${id}`, changes),
    // prefix match also refreshes the open workspace's detail (invite code)
    onSuccess: () => qc.invalidateQueries({ queryKey: workspacesQuery.queryKey }),
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/workspaces/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: workspacesQuery.queryKey }),
  });
}

export function useJoinWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) =>
      api.post<{ workspace: { id: string; name: string } }>('/workspaces/join', { inviteCode }),
    onSuccess: () => qc.invalidateQueries({ queryKey: workspacesQuery.queryKey }),
  });
}
