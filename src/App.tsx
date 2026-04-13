import React, { Suspense } from 'react'
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import LandingPage from './pages/LandingPage'
import ErrorBoundary from './components/ErrorBoundary'
import { useLayoutStore } from './store/useLayoutStore'

const LazyWelcomeScreen = React.lazy(() => import('./components/WelcomeScreen'))
const LazyAppLayout = React.lazy(() => import('./components/AppLayout'))

function LoadingFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      Loading…
    </div>
  )
}

function SuspenseWelcome() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <LazyWelcomeScreen />
      </Suspense>
    </ErrorBoundary>
  )
}

function SuspenseAppLayout() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <LazyAppLayout />
      </Suspense>
    </ErrorBoundary>
  )
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
})

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app',
  component: SuspenseWelcome,
})

const appCanvasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/canvas',
  component: SuspenseAppLayout,
})

// /app/generate is deprecated — redirect to /app/canvas and activate generate mode.
// Mode is set synchronously via getState() before the redirect. The persist middleware
// initialises at module load time (before any route resolution), so rehydration will have
// already started; the synchronous setMode call therefore wins over any rehydrated value.
// The mode is intentionally NOT encoded in the redirect URL — the store is the source of
// truth and bidirectional URL↔store sync was explicitly rejected (see ADR 1, ENG-22).
const appGenerateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/generate',
  beforeLoad() {
    useLayoutStore.getState().setMode('generate')
    throw redirect({ to: '/app/canvas' })
  },
})

const routeTree = rootRoute.addChildren([indexRoute, appRoute, appCanvasRoute, appGenerateRoute])

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export default function App() {
  return (
    <TooltipProvider>
      <RouterProvider router={router} />
    </TooltipProvider>
  )
}
