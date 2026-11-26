import { useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { providersQuery, useAuthMutation } from '../lib/queries';

const OAUTH_ERRORS: Record<string, string> = {
  oauth_cancelled: 'Google sign-in was cancelled.',
  oauth_state: 'That sign-in link expired. Please try again.',
  oauth_failed: "Couldn't finish signing in with Google. Please try again.",
  oauth_unavailable: 'Google sign-in is not available right now.',
  email_unverified: 'Your Google account email is not verified.',
  account_exists:
    'An account with this email already exists. Log in with your password instead.',
};

// Google's "G" mark, per their sign-in branding guidelines
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-[18px] w-[18px]" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const auth = useAuthMutation(mode);
  const navigate = useNavigate();
  const { error: oauthError } = useSearch({ from: '/login' });
  const { data: providers } = useQuery(providersQuery);

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

        {oauthError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {OAUTH_ERRORS[oauthError] ?? 'Sign-in failed. Please try again.'}
          </p>
        )}

        {providers?.google && (
          <>
            {/* full-page navigation: the server redirects to Google and back */}
            <a
              href="/api/auth/google"
              className="flex w-full items-center justify-center gap-3 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 dark:border-neutral-600 dark:focus-visible:outline-violet-400"
            >
              <GoogleMark />
              Continue with Google
            </a>
            <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
              or
              <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
            </div>
          </>
        )}

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
