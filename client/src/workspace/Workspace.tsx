import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Editor from '../components/Editor';
import Canvas from '../figma/Canvas';

type Surface = 'notion' | 'figma';
type WorkspaceItem = { id: string; name: string; figma: boolean };

const STORAGE_KEY = 'lazy-builder-workspaces';

// load saved workspaces from localStorage — just local for now, server sync later
function loadWorkspaces(): WorkspaceItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as WorkspaceItem[];
  } catch {
    /* ignore corrupt storage */
  }
  return [{ id: 'welcome', name: 'Welcome', figma: true }];
}

export default function Workspace() {
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>(loadWorkspaces);
  const [activeId, setActiveId] = useState<string>(() => workspaces[0]?.id ?? 'welcome');
  const [surface, setSurface] = useState<Surface>('notion');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingWsId, setEditingWsId] = useState<string | null>(null);
  const [editWsName, setEditWsName] = useState('');

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
  }, [workspaces]);

  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];

  // kick back to Notion if workspace has no Figma board
  useEffect(() => {
    if (surface === 'figma' && active && !active.figma) setSurface('notion');
  }, [surface, active]);

  const createWorkspace = () => {
    const id = crypto.randomUUID();
    const ws: WorkspaceItem = { id, name: `Untitled ${workspaces.length + 1}`, figma: false };
    setWorkspaces((w) => [...w, ws]);
    setActiveId(id);
    setSurface('notion');
  };

  // bolt on a Figma board to this workspace
  const addFigma = () => {
    setWorkspaces((w) => w.map((x) => (x.id === activeId ? { ...x, figma: true } : x)));
    setSurface('figma');
  };

  const selectWorkspace = (id: string) => {
    setActiveId(id);
    setSurface('notion');
    setSelectedNodeId(null);
  };

  const handleFigmaRefClick = (nodeId: string) => {
    if (!active?.figma) return;
    setSelectedNodeId(nodeId);
    setSurface('figma');
  };

  const startRenameWs = (ws: WorkspaceItem) => {
    setEditingWsId(ws.id);
    setEditWsName(ws.name);
  };

  const commitRenameWs = () => {
    if (editingWsId && editWsName.trim()) {
      setWorkspaces((w) => w.map((x) => (x.id === editingWsId ? { ...x, name: editWsName.trim() } : x)));
    }
    setEditingWsId(null);
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
                  onClick={() => selectWorkspace(w.id)}
                  onDoubleClick={() => startRenameWs(w)}
                  className={`flex w-full items-center justify-between gap-2 truncate rounded-md px-3 py-1.5 text-left text-sm ${
                    w.id === activeId
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
                  {w.figma && <span title="has Figma board">🎨</span>}
                </button>
              </li>
            ))}
          </ul>

          <button
            onClick={() => setDark((v) => !v)}
            className="mt-auto rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
          >
            {dark ? '☀️ Light' : '🌙 Dark'}
          </button>
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
          <Tab active={surface === 'notion'} onClick={() => setSurface('notion')}>
            📝 Notion
          </Tab>
          {active?.figma ? (
            <Tab active={surface === 'figma'} onClick={() => setSurface('figma')}>
              🎨 Figma
            </Tab>
          ) : (
            <button
              onClick={addFigma}
              className="rounded-md border border-dashed border-neutral-300 px-3 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              ＋ Add Figma page
            </button>
          )}
          <span className="ml-2 truncate text-sm text-neutral-400">{active?.name}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {surface === 'notion' ? (
            <div className="h-full overflow-auto p-8">
              <div className="mx-auto max-w-3xl">
                <Editor
                  key={`${active.id}:notion`}
                  docId={`${active.id}:notion`}
                  figmaBoardId={active.figma ? `${active.id}:figma` : undefined}
                  onFigmaRefClick={handleFigmaRefClick}
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
