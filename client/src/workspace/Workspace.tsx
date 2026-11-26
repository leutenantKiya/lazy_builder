import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import Editor from '../components/Editor';
import Canvas from '../figma/Canvas';
import type { WorkspaceSummary } from '../lib/api';
import {
  exportTargetsQuery,
  meQuery,
  useCreateWorkspace,
  useDeleteWorkspace,
  useJoinWorkspace,
  useLogout,
  useUpdateWorkspace,
  workspaceQuery,
  workspacesQuery,
} from '../lib/queries';

type Surface = 'notion' | 'figma';

// workspaces live on the server now; the active one comes from the URL (/w/:id)
export default function Workspace({ workspaceId }: { workspaceId?: string }) {
  const navigate = useNavigate();
  const { data: workspaces = [], isSuccess } = useQuery(workspacesQuery);
  const { data: me } = useQuery(meQuery);
  const active = workspaces.find((w) => w.id === workspaceId);

  const createWs = useCreateWorkspace();
  const updateWs = useUpdateWorkspace();
  const { data: detail } = useQuery({ ...workspaceQuery(workspaceId ?? ''), enabled: !!workspaceId });
  const { data: targets = [] } = useQuery(exportTargetsQuery);
  const deleteWs = useDeleteWorkspace();
  const joinWs = useJoinWorkspace();
  const logout = useLogout();

  const [surface, setSurface] = useState<Surface>('notion');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingWsId, setEditingWsId] = useState<string | null>(null);
  const [editWsName, setEditWsName] = useState('');
  const [inviteInput, setInviteInput] = useState('');

  const [dark, setDark] = useState(
    () =>
      localStorage.theme === 'dark' ||
      (!('theme' in localStorage) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.theme = dark ? 'dark' : 'light';
  }, [dark]);

  // unknown id (deleted, removed from it, typo) -> back to the index
  useEffect(() => {
    if (workspaceId && isSuccess && !active) navigate({ to: '/', replace: true });
  }, [workspaceId, isSuccess, active, navigate]);

  // kick back to Notion if workspace has no Figma board
  useEffect(() => {
    if (surface === 'figma' && active && !active.hasCanvas) setSurface('notion');
  }, [surface, active]);

  const readOnly = active?.role === 'viewer';

  const openWorkspace = (id: string) => navigate({ to: '/w/$workspaceId', params: { workspaceId: id } });

  const createWorkspace = () => {
    createWs.mutate(
      { name: `Untitled ${workspaces.length + 1}` },
      { onSuccess: ({ workspace }) => openWorkspace(workspace.id) },
    );
  };

  // bolt on a Figma board to this workspace
  const addFigma = () => {
    if (!active) return;
    updateWs.mutate({ id: active.id, hasCanvas: true }, { onSuccess: () => setSurface('figma') });
  };

  const handleFigmaRefClick = (nodeId: string) => {
    if (!active?.hasCanvas) return;
    setSelectedNodeId(nodeId);
    setSurface('figma');
  };

  const startRenameWs = (ws: WorkspaceSummary) => {
    if (ws.role === 'viewer') return;
    setEditingWsId(ws.id);
    setEditWsName(ws.name);
  };

  const commitRenameWs = () => {
    const ws = workspaces.find((w) => w.id === editingWsId);
    if (ws && editWsName.trim() && editWsName.trim() !== ws.name) {
      updateWs.mutate({ id: ws.id, name: editWsName.trim() });
    }
    setEditingWsId(null);
  };

  const removeWorkspace = () => {
    if (!active || !confirm(`Delete "${active.name}" and its documents? This can't be undone.`)) return;
    deleteWs.mutate(active.id, { onSuccess: () => navigate({ to: '/', replace: true }) });
  };

  const join = (e: FormEvent) => {
    e.preventDefault();
    const code = inviteInput.trim();
    if (!code) return;
    joinWs.mutate(code, {
      onSuccess: ({ workspace }) => {
        setInviteInput('');
        openWorkspace(workspace.id);
      },
    });
  };

  return (
    <div className="relative flex h-screen bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      {sidebarOpen ? (
        <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-200 p-4 dark:border-neutral-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
              Lazy Builder
            </h2>
            <button
              onClick={() => setSidebarOpen(false)}
              title="Hide sidebar"
              className="rounded px-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              «
            </button>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Workspaces
            </span>
            <button
              onClick={createWorkspace}
              title="New workspace"
              className="rounded px-1.5 text-lg leading-none text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              +
            </button>
          </div>

          <ul className="space-y-0.5">
            {workspaces.map((w) => (
              <li key={w.id}>
                <button
                  onClick={() => openWorkspace(w.id)}
                  onDoubleClick={() => startRenameWs(w)}
                  className={`flex w-full items-center justify-between gap-2 truncate rounded-md px-3 py-1.5 text-left text-sm ${
                    w.id === workspaceId
                      ? 'bg-neutral-200 font-medium dark:bg-neutral-700'
                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {editingWsId === w.id ? (
                    <input
                      autoFocus
                      value={editWsName}
                      onChange={(e) => setEditWsName(e.target.value)}
                      onBlur={commitRenameWs}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitRenameWs(); if (e.key === 'Escape') setEditingWsId(null); }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 rounded border border-violet-400 bg-white px-1 py-0 text-sm outline-none dark:bg-neutral-800"
                    />
                  ) : (
                    <span className="truncate">{w.name}</span>
                  )}
                  {w.hasCanvas && <span title="has Figma board">🎨</span>}
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={join} className="mt-4 space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Join with code</span>
            <div className="flex gap-1">
              <input
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                placeholder="Invite code"
                className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm outline-none focus:border-violet-500 dark:border-neutral-700"
              />
              <button
                type="submit"
                disabled={joinWs.isPending}
                className="rounded-md border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Join
              </button>
            </div>
            {joinWs.error && <p className="text-xs text-red-600 dark:text-red-400">{joinWs.error.message}</p>}
          </form>

          <div className="mt-auto space-y-2">
            <p className="truncate text-xs text-neutral-500" title={me?.email}>
              {me?.name ?? me?.email}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDark((v) => !v)}
                className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
              >
                {dark ? '☀️ Light' : '🌙 Dark'}
              </button>
              <button
                onClick={() => logout.mutate(undefined, { onSuccess: () => navigate({ to: '/login' }) })}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
              >
                Log out
              </button>
            </div>
          </div>
        </aside>
      ) : (
        <button
          onClick={() => setSidebarOpen(true)}
          title="Show sidebar"
          className="absolute left-3 top-3 z-20 rounded-md border border-neutral-300 bg-white/80 px-2 py-1 text-sm backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/80"
        >
          ☰
        </button>
      )}

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* surface tabs for the active workspace */}
        <div className={`flex items-center gap-1 border-b border-neutral-200 py-2 pr-4 dark:border-neutral-800 ${sidebarOpen ? 'pl-4' : 'pl-12'}`}>
          {active && (
            <Tab active={surface === 'notion'} onClick={() => setSurface('notion')}>
              📝 Notion
            </Tab>
          )}
          {!active ? null : active.hasCanvas ? (
            <Tab active={surface === 'figma'} onClick={() => setSurface('figma')}>
              🎨 Figma
            </Tab>
          ) : readOnly ? null : (
            <button
              onClick={addFigma}
              className="rounded-md border border-dashed border-neutral-300 px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              ＋ Add Figma page
            </button>
          )}
          <span className="ml-2 truncate text-sm text-neutral-400">
            {active?.name}
            {readOnly && ' (view only)'}
          </span>

          {active && (
            <div className="ml-auto flex items-center gap-2">
              {/* which stack the canvas exports to; generators ship later */}
              <label className="flex items-center gap-1 text-sm text-neutral-500">
                Export to
                <select
                  value={active.exportTarget}
                  disabled={readOnly || updateWs.isPending}
                  onChange={(e) => updateWs.mutate({ id: active.id, exportTarget: e.target.value })}
                  className="rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
                >
                  {targets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                      {t.ready ? '' : ' (soon)'}
                    </option>
                  ))}
                </select>
              </label>
              {(() => {
                const target = targets.find((t) => t.id === active.exportTarget);
                const why = !active.hasCanvas
                  ? 'Add a Figma page first'
                  : !target?.ready
                    ? `${target?.label ?? 'This target'} export is coming soon`
                    : `Download a ${target.label} project`;
                const enabled = active.hasCanvas && !!target?.ready;
                // plain link: same-origin, so the auth cookie rides along and the browser saves the zip
                return (
                  <a
                    href={enabled ? `/api/workspaces/${active.id}/export` : undefined}
                    download
                    aria-disabled={!enabled}
                    title={why}
                    className={`rounded-md px-3 py-1 text-sm font-medium ${
                      enabled
                        ? 'bg-violet-600 text-white hover:bg-violet-700'
                        : 'cursor-not-allowed bg-neutral-200 text-neutral-400 dark:bg-neutral-800'
                    }`}
                  >
                    Export
                  </a>
                );
              })()}
              {detail?.workspace.inviteCode && (
                <button
                  onClick={() => navigator.clipboard?.writeText(detail.workspace.inviteCode!)}
                  title="Copy invite code"
                  className="rounded-md border border-neutral-300 px-2 py-1 font-mono text-xs text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  invite: {detail.workspace.inviteCode}
                </button>
              )}
              {active.role === 'owner' && (
                <button
                  onClick={removeWorkspace}
                  className="rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {!active ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-neutral-500">
              <p>No workspaces yet.</p>
              <button
                onClick={createWorkspace}
                className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700"
              >
                Create one
              </button>
            </div>
          ) : surface === 'notion' ? (
            <div className="h-full overflow-auto p-8">
              <div className="mx-auto max-w-3xl">
                <Editor
                  key={`${active.id}:notion`}
                  docId={`${active.id}:notion`}
                  figmaBoardId={active.hasCanvas ? `${active.id}:figma` : undefined}
                  onFigmaRefClick={handleFigmaRefClick}
                  readOnly={readOnly}
                />
              </div>
            </div>
          ) : (
            <Canvas
              key={`${active.id}:figma`}
              boardId={`${active.id}:figma`}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm ${
        active
          ? 'bg-neutral-200 font-medium dark:bg-neutral-700'
          : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
      }`}
    >
      {children}
    </button>
  );
}
