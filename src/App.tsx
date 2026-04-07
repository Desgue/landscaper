import React, { Suspense } from 'react'
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router'
import LandingPage from './pages/LandingPage'

const LazyWelcomeScreen = React.lazy(() => import('./components/WelcomeScreen'))
const LazyAppLayout = React.lazy(() =>
  import('./components/registerInspectorSlots').then(() =>
    import('./components/AppLayout')
  )
)

function LoadingFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      Loading…
    </div>
  )
}

function SuspenseWelcome() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LazyWelcomeScreen />
    </Suspense>
  )
}

function SuspenseAppLayout() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LazyAppLayout />
    </Suspense>
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

const routeTree = rootRoute.addChildren([indexRoute, appRoute, appCanvasRoute])

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export default function App() {
  return <RouterProvider router={router} />
}
