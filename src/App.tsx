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
const LazyGeneratePage = React.lazy(() => import('./pages/GeneratePage'))

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-800">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Gallery />
        <HowItWorks />
        <TrustBar />
        <Pricing />
        <CTABanner />
      </main>
      <Footer />
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

function SuspenseGeneratePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LazyGeneratePage />
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
  return <RouterProvider router={router} />
}
