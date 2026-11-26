import { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import LoginPage from './auth/LoginPage';
import { meQuery, workspacesQuery } from './lib/queries';
import Workspace from './workspace/Workspace';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Outlet,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: async ({ context }) => {
    if (await context.queryClient.ensureQueryData(meQuery)) throw redirect({ to: '/' });
  },
  component: LoginPage,
});

// everything below requires a session
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: async ({ context }) => {
    if (!(await context.queryClient.ensureQueryData(meQuery))) throw redirect({ to: '/login' });
  },
  component: Outlet,
});

// land on the first workspace, or the empty state when there are none
const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/',
  loader: ({ context }) => context.queryClient.ensureQueryData(workspacesQuery),
  component: function Index() {
    const first = indexRoute.useLoaderData()[0];
    return first ? <Navigate to="/w/$workspaceId" params={{ workspaceId: first.id }} replace /> : <Workspace />;
  },
});

const workspaceRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/w/$workspaceId',
  loader: ({ context }) => context.queryClient.ensureQueryData(workspacesQuery),
  component: function WorkspaceRoute() {
    const { workspaceId } = workspaceRoute.useParams();
    return <Workspace key={workspaceId} workspaceId={workspaceId} />;
  },
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([loginRoute, appRoute.addChildren([indexRoute, workspaceRoute])]),
  context: { queryClient },
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
