import { useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { CircleNotch, Warning } from '@phosphor-icons/react';
import { providersQuery, useAuthMutation } from '../lib/queries';
import Monogram from '../components/Monogram';
import LoginPoster from './LoginPoster';

const OAUTH_ERRORS: Record<string, string> = {
  oauth_cancelled: "Google sign-in didn't finish. Try again, or use email.",
  oauth_state: 'That sign-in link expired. Please try again.',
  oauth_failed: "Couldn't finish signing in with Google. Please try again.",
  oauth_unavailable: 'Google sign-in is not available right now.',
  email_unverified: 'Your Google account email is not verified.',
  account_exists:
    'An account with this email already exists. Log in with your password instead.',
};

// Google's full-colour "G" mark, unmodified (sign-in branding guidelines)
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-[18px] w-[18px] shrink-0" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function Spinner() {
  return <CircleNotch size={14} className="animate-spin" aria-hidden="true" />;
}

const field =
  'h-10 w-full rounded-md border border-border-strong bg-transparent px-2.5 text-[16px] text-text transition-colors duration-fast placeholder:text-text-subtle hover:border-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:border-border disabled:bg-surface-hover disabled:text-text-disabled sm:text-base';
const label = 'mb-1.5 block text-xs font-medium text-text-muted';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [googleBusy, setGoogleBusy] = useState(false);
  const auth = useAuthMutation(mode);
  const navigate = useNavigate();
  const { error: oauthError } = useSearch({ from: '/login' });
  const { data: providers } = useQuery(providersQuery);
  const id = useId();

  // coming back with the browser's back button must not leave the button stuck
  useEffect(() => {
    const reset = () => setGoogleBusy(false);
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    auth.mutate(
      { email, password, ...(mode === 'register' && name.trim() ? { name: name.trim() } : {}) },
      { onSuccess: () => navigate({ to: '/' }) },
    );
  };

  const errorMessage = auth.error
    ? auth.error.message
    : oauthError
      ? (OAUTH_ERRORS[oauthError] ?? 'Sign-in failed. Please try again.')
      : null;

  const isLogin = mode === 'login';

  return (
    <div className="min-h-screen bg-bg text-text lg:grid lg:grid-cols-[480px_1fr]">
      <LoginPoster className="block h-[200px] w-full border-b border-border bg-canvas lg:hidden" />

      <main className="flex flex-col justify-center px-4 py-8 lg:py-12 lg:pl-16 lg:pr-0">
        <div className="mx-auto w-full max-w-[400px] lg:mx-0">
          <div className="mb-8 hidden lg:block">
            <p className="text-display font-semibold tracking-[-0.03em] text-text">
              <span className="block">Lay it out.</span>
              <span className="block">Write it down.</span>
              <span className="block">Ship React.</span>
            </p>
            <p className="mt-4 text-base text-text-muted">
              A canvas and a doc in one workspace, cross-linked, exporting a real Vite project.
            </p>
          </div>

          <div className="animate-[lb-rise_var(--duration-moment)_var(--ease-out)_both] rounded-xl bg-surface p-5 sm:p-8 dark:border dark:border-border">
            <div className="mb-6 flex items-center gap-2">
              <Monogram />
              <span className="text-sm font-medium text-text">Lazy Builder</span>
            </div>

            <h1 className="text-xl font-semibold text-text">
              {isLogin ? 'Log in' : 'Create your account'}
            </h1>
            <p className="mt-1 text-sm text-text-muted">to your Lazy Builder workspaces</p>

            {providers?.google && (
              <>
                {/* full-page navigation: the server redirects to Google and back */}
                <a
                  href="/api/auth/google"
                  aria-busy={googleBusy}
                  aria-disabled={googleBusy}
                  onClick={(e) => {
                    if (googleBusy) e.preventDefault();
                    else setGoogleBusy(true);
                  }}
                  className={`mt-6 flex h-10 w-full items-center rounded-sm border border-[#747775] bg-white pl-3 pr-3 font-sans text-base font-medium text-[#1f1f1f] transition-[background-color,transform] duration-fast ease-out hover:bg-[#f7f8f8] active:scale-[.98] dark:border-[#8e918f] dark:bg-[#131314] dark:text-[#e3e3e3] dark:hover:bg-[#1f1f22] ${googleBusy ? 'pointer-events-none' : ''}`}
                >
                  <GoogleMark />
                  <span className="flex flex-1 items-center justify-center gap-2 pl-2.5">
                    {googleBusy && <Spinner />}
                    {googleBusy ? 'Connecting to Google…' : 'Continue with Google'}
                  </span>
                  {/* balances the G so the label stays centred */}
                  <span aria-hidden="true" className="w-[18px] shrink-0" />
                </a>
                <div className="my-5 flex items-center gap-3 text-xs text-text-subtle">
                  <span aria-hidden="true" className="h-px flex-1 bg-border" />
                  or
                  <span aria-hidden="true" className="h-px flex-1 bg-border" />
                </div>
              </>
            )}

            <form onSubmit={submit} className={`space-y-4 ${providers?.google ? '' : 'mt-6'}`}>
              {!isLogin && (
                <div>
                  <label htmlFor={`${id}-name`} className={label}>
                    Name
                  </label>
                  <input
                    id={`${id}-name`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className={field}
                  />
                </div>
              )}
              <div>
                <label htmlFor={`${id}-email`} className={label}>
                  Email
                </label>
                <input
                  id={`${id}-email`}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  aria-invalid={auth.error ? true : undefined}
                  className={field}
                />
              </div>
              <div>
                <label htmlFor={`${id}-password`} className={label}>
                  Password
                </label>
                <input
                  id={`${id}-password`}
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  aria-describedby={`${id}-pw-help`}
                  aria-invalid={auth.error ? true : undefined}
                  className={field}
                />
                <p id={`${id}-pw-help`} className="mt-1.5 text-xs text-text-subtle">
                  At least 8 characters
                </p>
              </div>

              {errorMessage && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger"
                >
                  <Warning size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={auth.isPending}
                aria-busy={auth.isPending}
                className="flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-accent text-sm font-medium text-accent-fg transition-[background-color,transform] duration-fast ease-out hover:bg-accent-hover active:scale-[.98] active:bg-accent-pressed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:bg-surface-active disabled:text-text-disabled disabled:active:scale-100"
              >
                {auth.isPending && <Spinner />}
                {auth.isPending
                  ? isLogin
                    ? 'Logging in…'
                    : 'Creating account…'
                  : isLogin
                    ? 'Log in'
                    : 'Create account'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-text-muted">
              {isLogin ? 'No account? ' : 'Have an account? '}
              <button
                type="button"
                onClick={() => {
                  setMode(isLogin ? 'register' : 'login');
                  auth.reset();
                }}
                className="rounded-sm font-medium text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {isLogin ? 'Create one' : 'Log in'}
              </button>
            </p>
          </div>
        </div>
      </main>

      <LoginPoster className="hidden h-full min-h-screen w-full bg-canvas lg:block" />
    </div>
  );
}
