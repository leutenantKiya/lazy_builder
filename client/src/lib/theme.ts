import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'theme';

// dark unless the user explicitly chose light
function read(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'light';
  } catch {
    return true;
  }
}

const listeners = new Set<() => void>();

function apply(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}

export function setDark(dark: boolean) {
  try {
    localStorage.setItem(KEY, dark ? 'dark' : 'light');
  } catch {
    // storage blocked: theme just won't persist
  }
  apply(dark);
  listeners.forEach((l) => l());
}

// keep the class in sync on module load (index.html also sets it before first paint)
apply(read());

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** [isDark, toggle] */
export function useTheme(): [boolean, () => void] {
  const dark = useSyncExternalStore(subscribe, read);
  const toggle = useCallback(() => setDark(!read()), []);
  return [dark, toggle];
}
