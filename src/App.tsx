import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import Gallery from './components/Gallery'
import HowItWorks from './components/HowItWorks'
import Footer from './components/Footer'
import './index.css'



function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-800">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Gallery />
        <HowItWorks />
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
