import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  Check,
  CaretDown,
  CircleNotch,
  Copy,
  DotsThree,
  DownloadSimple,
  Eye,
  FileText,
  Moon,
  Plus,
  Selection,
  SidebarSimple,
  SignOut,
  SquareHalf,
  Sun,
  Warning,
} from '@phosphor-icons/react';
import Editor from '../components/Editor';
import Monogram from '../components/Monogram';
import Canvas from '../figma/Canvas';
import { useTheme } from '../lib/theme';
import type { WorkspaceSummary } from '../lib/api';
import {
  exportTargetsQuery,
  meQuery,
  useCreateWorkspace,
  useDeleteWorkspace,
  useExportWorkspace,
  useJoinWorkspace,
  useLogout,
  useUpdateWorkspace,
  workspaceQuery,
  workspacesQuery,
} from '../lib/queries';
import ConfirmDialog from './ConfirmDialog';
import EmptyIllustration from './EmptyIllustration';
import { Toasts, type ToastData } from './Toasts';
import { btnDangerGhost, btnGhost, btnIcon, btnPrimary, btnSecondary, inputCls } from './ui';

type Surface = 'notion' | 'figma';

const isNarrow = () => !window.matchMedia('(min-width: 768px)').matches;

// workspaces live on the server now; the active one comes from the URL (/w/:id)
export default function Workspace({ workspaceId }: { workspaceId?: string }) {
  const navigate = useNavigate();
  const { data: workspaces = [], isSuccess, isError, refetch } = useQuery(workspacesQuery);
  const { data: me } = useQuery(meQuery);
  const active = workspaces.find((w) => w.id === workspaceId);

  const createWs = useCreateWorkspace();
  const updateWs = useUpdateWorkspace();
  const { data: detail } = useQuery({ ...workspaceQuery(workspaceId ?? ''), enabled: !!workspaceId });
  const { data: targets = [] } = useQuery(exportTargetsQuery);
  const deleteWs = useDeleteWorkspace();
  const joinWs = useJoinWorkspace();
  const logout = useLogout();
  const exportWs = useExportWorkspace();

  const [surface, setSurface] = useState<Surface>('notion');
  const [sidebarOpen, setSidebarOpen] = useState(() => !isNarrow());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingWsId, setEditingWsId] = useState<string | null>(null);
  const [editWsName, setEditWsName] = useState('');
  const [inviteInput, setInviteInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exported, setExported] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const joinRef = useRef<HTMLInputElement>(null);
  const toastId = useRef(0);

  const [dark, toggleTheme] = useTheme();

  const pushToast = useCallback((t: Omit<ToastData, 'id'>) => {
    setToasts((all) => [...all, { ...t, id: ++toastId.current }]);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  // unknown id (deleted, removed from it, typo) -> back to the index
  useEffect(() => {
    if (workspaceId && isSuccess && !active) navigate({ to: '/', replace: true });
  }, [workspaceId, isSuccess, active, navigate]);

  // kick back to the doc if the workspace has no canvas
  useEffect(() => {
    if (surface === 'figma' && active && !active.hasCanvas) setSurface('notion');
  }, [surface, active]);

  // the "Downloaded" state lasts 2s
  useEffect(() => {
    if (!exported) return;
    const t = setTimeout(() => setExported(false), 2000);
    return () => clearTimeout(t);
  }, [exported]);

  const readOnly = active?.role === 'viewer';

  const openWorkspace = (id: string) => {
    if (isNarrow()) setSidebarOpen(false);
    navigate({ to: '/w/$workspaceId', params: { workspaceId: id } });
  };

  const createWorkspace = () => {
    createWs.mutate(
      { name: `Untitled ${workspaces.length + 1}` },
      { onSuccess: ({ workspace }) => openWorkspace(workspace.id) },
    );
  };

  // bolt a canvas on to this workspace
  const addCanvas = () => {
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
    if (!active) return;
    deleteWs.mutate(active.id, {
      onSuccess: () => {
        setConfirmDelete(false);
        navigate({ to: '/', replace: true });
      },
      onError: (e) => {
        setConfirmDelete(false);
        pushToast({ kind: 'error', title: `Couldn't delete ${active.name}`, body: e.message });
      },
    });
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

  const focusJoin = () => {
    setSidebarOpen(true);
    // wait a frame so the (possibly collapsed) sidebar is interactive
    setTimeout(() => joinRef.current?.focus(), 0);
  };

  const target = active ? targets.find((t) => t.id === active.exportTarget) : undefined;
  const exportEnabled = !!active?.hasCanvas && !!target?.ready;
  const exportReason = !active
    ? ''
    : !active.hasCanvas
      ? 'Add a canvas first'
      : !target?.ready
        ? `${target?.label ?? 'This target'} export is coming soon`
        : '';

  const runExport = () => {
    if (!active || !exportEnabled || exportWs.isPending) return;
    exportWs.mutate(active.id, {
      onSuccess: ({ blob, filename }) => {
        // blob -> object URL -> click, so we know the file arrived
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
        setExported(true);
        pushToast({
          kind: 'success',
          title: `${filename} downloaded`,
          body: `${target?.label ?? 'Project'} project. Unzip, then `,
          code: 'npm install && npm run dev',
        });
      },
      onError: (e) =>
        pushToast({
          kind: 'error',
          title: `Export failed: ${e.message}`,
          action: { label: 'Try again', run: runExport },
        }),
    });
  };

  const copyInvite = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      return true;
    } catch {
      return false;
    }
  };

  const onSidebarKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isNarrow()) setSidebarOpen(false);
  };

  const deleteButton = (
    <button onClick={() => setConfirmDelete(true)} className={btnDangerGhost}>
      Delete
    </button>
  );

  return (
    <div className="relative flex h-dvh overflow-hidden bg-bg text-text">
      {/* scrim behind the sidebar drawer on phones */}
      {sidebarOpen && (
        <div
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
        />
      )}

      <div
        onKeyDown={onSidebarKey}
        style={{ width: sidebarOpen ? 248 : 0 }}
        className="z-30 shrink-0 overflow-hidden transition-[width] duration-slow ease-in-out max-md:fixed max-md:inset-y-0 max-md:left-0"
      >
        <aside
          inert={!sidebarOpen}
          aria-label="Workspaces"
          className="flex h-full w-[248px] flex-col border-r border-border bg-surface p-3"
        >
          <div className="mb-4 flex h-8 items-center justify-between">
            <div className="flex items-center gap-2 pl-1">
              <Monogram />
              <span className="text-sm font-semibold">Lazy Builder</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} aria-label="Hide sidebar" className={btnIcon}>
              <SidebarSimple size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="mb-1 flex items-center justify-between pl-2.5">
            <h2 className="text-xs font-medium text-text-muted">Workspaces</h2>
            <button
              onClick={createWorkspace}
              disabled={createWs.isPending}
              aria-label="New workspace"
              className={`${btnIcon} !h-6 !w-6`}
            >
              <Plus size={14} aria-hidden="true" />
            </button>
          </div>

          <ul className="-mx-0 min-h-0 space-y-0.5 overflow-y-auto">
            {workspaces.map((w) => {
              const isActive = w.id === workspaceId;
              return (
                <li key={w.id} className="relative">
                  {isActive && (
                    <span aria-hidden="true" className="absolute left-0.5 top-2 h-4 w-0.5 rounded-full bg-accent" />
                  )}
                  {editingWsId === w.id ? (
                    <input
                      autoFocus
                      aria-label={`Rename ${w.name}`}
                      value={editWsName}
                      onChange={(e) => setEditWsName(e.target.value)}
                      onBlur={commitRenameWs}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') commitRenameWs();
                        if (e.key === 'Escape') setEditingWsId(null);
                      }}
                      className={`${inputCls} !h-8 w-full !text-sm`}
                    />
                  ) : (
                    <button
                      onClick={() => openWorkspace(w.id)}
                      onDoubleClick={() => startRenameWs(w)}
                      onKeyDown={(e) => {
                        if (e.key === 'F2') startRenameWs(w);
                      }}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex h-8 w-full items-center justify-between gap-2 rounded-md px-2.5 text-left text-sm text-text transition-colors duration-fast ${
                        isActive ? 'bg-surface-active font-medium' : 'hover:bg-surface-hover'
                      }`}
                    >
                      <span className="truncate">{w.name}</span>
                      {w.hasCanvas && (
                        <SquareHalf
                          size={14}
                          role="img"
                          aria-label="Has a canvas"
                          className="shrink-0 text-text-subtle"
                        />
                      )}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <form onSubmit={join} className="mt-5">
            <label htmlFor="join-code" className="mb-1.5 block text-xs font-medium text-text-muted">
              Join with code
            </label>
            <div className="flex gap-1.5">
              <input
                id="join-code"
                ref={joinRef}
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                placeholder="Invite code"
                autoComplete="off"
                aria-invalid={joinWs.error ? true : undefined}
                aria-describedby={joinWs.error ? 'join-error' : undefined}
                className={`${inputCls} flex-1 ${joinWs.error ? '!border-danger !bg-danger-subtle' : ''}`}
              />
              <button type="submit" disabled={joinWs.isPending} aria-busy={joinWs.isPending} className={btnSecondary}>
                {joinWs.isPending ? 'Joining…' : 'Join'}
              </button>
            </div>
            {joinWs.error && (
              <p id="join-error" className="mt-1.5 flex items-start gap-1 text-xs text-danger">
                <Warning size={14} className="mt-px shrink-0" aria-hidden="true" />
                {joinWs.error.message}
              </p>
            )}
          </form>

          <div className="mt-auto border-t border-border pt-3">
            <p className="mb-2 truncate pl-1 text-xs text-text-muted" title={me?.email}>
              {me?.name ?? me?.email}
            </p>
            <div className="flex items-center justify-between">
              <button
                onClick={() => logout.mutate(undefined, { onSuccess: () => navigate({ to: '/login' }) })}
                className={btnGhost}
              >
                <SignOut size={16} aria-hidden="true" />
                Log out
              </button>
              <button
                onClick={toggleTheme}
                aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
                className={btnIcon}
              >
                {dark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </aside>
      </div>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-bg px-4 py-2">
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} aria-label="Show sidebar" className={btnIcon}>
              <SidebarSimple size={16} aria-hidden="true" />
            </button>
          )}

          {active && (
            <>
              <Tabs
                surface={surface}
                setSurface={setSurface}
                hasCanvas={active.hasCanvas}
              />
              {!active.hasCanvas && !readOnly && (
                <button onClick={addCanvas} disabled={updateWs.isPending} className={btnSecondary}>
                  <Plus size={16} aria-hidden="true" />
                  Add canvas
                </button>
              )}
              <span className="hidden min-w-0 truncate text-sm text-text-muted lg:inline">{active.name}</span>
              {readOnly && (
                <span className="inline-flex items-center gap-1 text-sm text-warning">
                  <Eye size={16} aria-hidden="true" />
                  View only
                </span>
              )}

              <div className="ml-auto flex items-center gap-2">
                {/* which stack the canvas exports to */}
                <label className="flex items-center gap-2 text-sm text-text-muted">
                  <span className="max-lg:sr-only">Export to</span>
                  <span className="relative">
                    <select
                      value={active.exportTarget}
                      disabled={readOnly || updateWs.isPending}
                      onChange={(e) => updateWs.mutate({ id: active.id, exportTarget: e.target.value })}
                      className={`${inputCls} appearance-none !text-sm pr-8 [&>option]:bg-surface-raised`}
                    >
                      {targets.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                          {t.ready ? '' : ' (soon)'}
                        </option>
                      ))}
                    </select>
                    <CaretDown
                      size={16}
                      aria-hidden="true"
                      className="pointer-events-none absolute right-2 top-2 text-text-muted"
                    />
                  </span>
                </label>

                <ExportButton
                  enabled={exportEnabled}
                  reason={exportReason}
                  pending={exportWs.isPending}
                  done={exported}
                  onClick={runExport}
                  title={target ? `Download a ${target.label} project` : undefined}
                />

                <div className="hidden items-center gap-2 min-[900px]:flex">
                  {detail?.workspace.inviteCode && (
                    <InviteChip code={detail.workspace.inviteCode} copy={copyInvite} />
                  )}
                  {active.role === 'owner' && deleteButton}
                </div>
                {(detail?.workspace.inviteCode || active.role === 'owner') && (
                  <MoreMenu>
                    {detail?.workspace.inviteCode && (
                      <InviteChip code={detail.workspace.inviteCode} copy={copyInvite} menu />
                    )}
                    {active.role === 'owner' && (
                      <button
                        role="menuitem"
                        data-close
                        onClick={() => setConfirmDelete(true)}
                        className="flex h-8 w-full items-center rounded-md px-2.5 text-left text-sm text-danger hover:bg-danger-subtle"
                      >
                        Delete workspace
                      </button>
                    )}
                  </MoreMenu>
                )}
              </div>
            </>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {!active ? (
            <EmptyState
              error={isError}
              retry={() => refetch()}
              onCreate={createWorkspace}
              creating={createWs.isPending}
              onJoin={focusJoin}
            />
          ) : surface === 'notion' ? (
            <div
              role="tabpanel"
              id="panel-notion"
              aria-labelledby="tab-notion"
              className="h-full overflow-auto bg-surface p-4 sm:p-8"
            >
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
            <div role="tabpanel" id="panel-figma" aria-labelledby="tab-figma" className="h-full">
              <Canvas
                key={`${active.id}:figma`}
                boardId={`${active.id}:figma`}
                selectedNodeId={selectedNodeId}
                onNodeSelect={setSelectedNodeId}
              />
            </div>
          )}
        </div>
      </main>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${active?.name ?? 'workspace'}?`}
        confirmLabel={deleteWs.isPending ? 'Deleting…' : 'Delete workspace'}
        busy={deleteWs.isPending}
        onConfirm={removeWorkspace}
        onClose={() => setConfirmDelete(false)}
      >
        This deletes the doc and canvas for everyone in this workspace. It can't be undone.
      </ConfirmDialog>

      <Toasts toasts={toasts} dismiss={dismissToast} />
    </div>
  );
}

// segmented control: Doc / Canvas (system.md 6.4), arrow keys move between tabs
function Tabs({
  surface,
  setSurface,
  hasCanvas,
}: {
  surface: Surface;
  setSurface: (s: Surface) => void;
  hasCanvas: boolean;
}) {
  const order: Surface[] = hasCanvas ? ['notion', 'figma'] : ['notion'];
  const onKey = (e: KeyboardEvent) => {
    const i = order.indexOf(surface);
    let next = i;
    if (e.key === 'ArrowRight') next = (i + 1) % order.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + order.length) % order.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = order.length - 1;
    else return;
    e.preventDefault();
    setSurface(order[next]);
    document.getElementById(`tab-${order[next]}`)?.focus();
  };
  const tab = (id: Surface, label: string, icon: ReactNode) => (
    <button
      role="tab"
      id={`tab-${id}`}
      aria-selected={surface === id}
      aria-controls={`panel-${id}`}
      tabIndex={surface === id ? 0 : -1}
      onClick={() => setSurface(id)}
      className={`inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-sm transition-colors duration-fast ${
        surface === id ? 'bg-surface-active font-medium text-text' : 'text-text-muted hover:text-text'
      }`}
    >
      {icon}
      {label}
    </button>
  );
  return (
    <div role="tablist" aria-label="Workspace surface" onKeyDown={onKey} className="flex gap-0.5 rounded-md bg-surface p-0.5">
      {tab('notion', 'Doc', <FileText size={14} aria-hidden="true" />)}
      {hasCanvas && tab('figma', 'Canvas', <Selection size={14} aria-hidden="true" />)}
    </div>
  );
}

function ExportButton({
  enabled,
  reason,
  pending,
  done,
  onClick,
  title,
}: {
  enabled: boolean;
  reason: string;
  pending: boolean;
  done: boolean;
  onClick: () => void;
  title?: string;
}) {
  const label = pending ? 'Preparing…' : done ? 'Downloaded' : 'Export';
  const icon = pending ? (
    <CircleNotch size={14} className="animate-spin" aria-hidden="true" />
  ) : done ? (
    <Check size={16} aria-hidden="true" />
  ) : (
    <DownloadSimple size={16} aria-hidden="true" />
  );
  const button = (
    <button
      onClick={onClick}
      disabled={!enabled}
      aria-busy={pending}
      aria-describedby={!enabled ? 'export-reason' : undefined}
      title={enabled ? title : undefined}
      className={`${btnPrimary} min-w-[112px]`}
    >
      {icon}
      {label}
    </button>
  );
  if (enabled) return button;
  // a disabled button can't take focus, so the wrapper carries the tooltip for keyboard users
  return (
    <span tabIndex={0} className="group relative inline-flex rounded-md">
      {button}
      <span
        id="export-reason"
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-40 mt-1.5 whitespace-nowrap rounded-sm bg-hud-bg px-2 py-1 text-xs font-medium text-hud-text opacity-0 transition-opacity duration-fast group-focus-visible:opacity-100 group-focus-visible:delay-500 group-hover:opacity-100 group-hover:delay-500"
      >
        {reason}
      </span>
    </span>
  );
}

function InviteChip({
  code,
  copy,
  menu,
}: {
  code: string;
  copy: (code: string) => Promise<boolean>;
  menu?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <>
      <button
        role={menu ? 'menuitem' : undefined}
        onClick={async () => setCopied(await copy(code))}
        aria-label="Copy invite code"
        className={
          menu
            ? 'flex h-8 w-full items-center justify-between gap-3 rounded-md px-2.5 text-left text-sm text-text hover:bg-surface-hover'
            : `${btnSecondary} font-mono !text-xs !font-normal`
        }
      >
        {menu ? (
          <span className="flex items-baseline gap-2">
            <span className="text-xs text-text-muted">Invite code</span>
            <span className="font-mono text-xs">{code}</span>
          </span>
        ) : (
          <span className="font-mono text-xs">{code}</span>
        )}
        {copied ? (
          <span className="inline-flex items-center gap-1 font-sans text-xs text-success">
            <Check size={14} aria-hidden="true" />
            Copied
          </span>
        ) : (
          <Copy size={14} aria-hidden="true" />
        )}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'Invite code copied' : ''}
      </span>
    </>
  );
}

// below 900px the invite chip and Delete live here
function MoreMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className="relative min-[900px]:hidden"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          setOpen(false);
          btnRef.current?.focus();
        }
      }}
    >
      <button
        ref={btnRef}
        onClick={() => setOpen((o) => !o)}
        aria-label="More"
        aria-haspopup="menu"
        aria-expanded={open}
        className={btnIcon}
      >
        <DotsThree size={16} weight="bold" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          onClick={(e) => {
            // actions that open a dialog close the menu; park focus on the trigger so the dialog returns here
            if (!(e.target as HTMLElement).closest('[data-close]')) return;
            setOpen(false);
            btnRef.current?.focus();
          }}
          className="absolute right-0 top-full z-40 mt-1.5 w-52 rounded-lg border border-border bg-surface-raised p-1 shadow-float animate-[lb-rise_var(--duration-base)_var(--ease-out)_both]"
        >
          {children}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  error,
  retry,
  onCreate,
  creating,
  onJoin,
}: {
  error: boolean;
  retry: () => void;
  onCreate: () => void;
  creating: boolean;
  onJoin: () => void;
}) {
  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="max-w-[420px]">
          <h1 className="text-lg font-semibold">Couldn't load your workspaces.</h1>
          <button onClick={retry} className={`${btnSecondary} mt-4`}>
            Try again
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full items-center justify-center overflow-auto p-4">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 text-border-strong">
          <EmptyIllustration />
        </div>
        <h1 className="text-lg font-semibold">Start your first workspace</h1>
        <p className="mt-2 text-sm text-text-muted">
          A workspace holds one doc and, when you add it, one canvas. Invite people with its code.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button onClick={onCreate} disabled={creating} aria-busy={creating} className={btnPrimary}>
            {creating && <CircleNotch size={14} className="animate-spin" aria-hidden="true" />}
            Create workspace
          </button>
          <button onClick={onJoin} className={btnSecondary}>
            Join with a code
          </button>
        </div>
      </div>
    </div>
  );
}
