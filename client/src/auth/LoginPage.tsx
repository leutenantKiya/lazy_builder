import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthMutation } from '../lib/queries';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const auth = useAuthMutation(mode);
  const navigate = useNavigate();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    auth.mutate(
      { email, password, ...(mode === 'register' && name.trim() ? { name: name.trim() } : {}) },
      { onSuccess: () => navigate({ to: '/' }) },
    );
  };

  const input =
    'w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-violet-500 dark:border-neutral-700';

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Lazy Builder</h1>
          <p className="text-sm text-neutral-500">
            {mode === 'login' ? 'Log in to your workspaces.' : 'Create an account.'}
          </p>
        </div>

        {mode === 'register' && (
          <label className="block space-y-1">
            <span className="text-sm">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={input} />
          </label>
        )}
        <label className="block space-y-1">
          <span className="text-sm">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className={input}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm">Password</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className={input}
          />
        </label>

        {auth.error && <p className="text-sm text-red-600 dark:text-red-400">{auth.error.message}</p>}

        <button
          type="submit"
          disabled={auth.isPending}
          className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {auth.isPending ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            auth.reset();
          }}
          className="w-full text-sm text-neutral-500 hover:underline"
        >
          {mode === 'login' ? 'No account? Register' : 'Have an account? Log in'}
        </button>
      </form>
    </div>
  );
}
