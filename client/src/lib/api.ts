// thin fetch wrapper for the Hono API. the auth cookie rides along automatically.

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? res.statusText);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

// ── Types (mirror server responses) ───────

export type User = { id: string; email: string; name: string | null };
export type Role = 'owner' | 'editor' | 'viewer';

export type WorkspaceSummary = {
  id: string;
  name: string;
  hasCanvas: boolean;
  exportTarget: string;
  role: Role;
  updatedAt: string;
};

export type WorkspaceDetail = {
  id: string;
  name: string;
  hasCanvas: boolean;
  exportTarget: string;
  inviteCode?: string; // owners only
};

export type ExportTarget = {
  id: string;
  label: string;
  framework: string;
  styling: string;
  ready: boolean;
};
