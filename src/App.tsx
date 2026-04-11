import React, { Suspense } from 'react'
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import LandingPage from './pages/LandingPage'
import ErrorBoundary from './components/ErrorBoundary'

const LazyWelcomeScreen = React.lazy(() => import('./components/WelcomeScreen'))
const LazyAppLayout = React.lazy(() => import('./components/AppLayout'))
const LazyGeneratePage = React.lazy(() => import('./pages/GeneratePage'))

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

function SuspenseGeneratePage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>
        <LazyGeneratePage />
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

const appGenerateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app/generate',
  component: SuspenseGeneratePage,
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
