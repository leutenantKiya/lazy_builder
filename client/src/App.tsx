import { useEffect, useState } from 'react';
import Editor from './components/Editor';

function App() {
  // default to saved choice, else fall back to the OS preference
  const [dark, setDark] = useState(
    () =>
      localStorage.theme === 'dark' ||
      (!('theme' in localStorage) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  // reflect state onto <html> + persist it
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.theme = dark ? 'dark' : 'light';
  }, [dark]);

  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="max-w-3xl mx-auto py-10 px-4">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Lazy Builder — Notion</h1>
          <button
            onClick={() => setDark((d) => !d)}
            className="rounded-md border border-neutral-300 px-3 py-1 text-sm dark:border-neutral-700"
          >
            {dark ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        <div className="rounded-lg border border-neutral-300 p-4 dark:border-neutral-700">
          <Editor />
        </div>
      </div>
    </div>
  );
}

export default App;
