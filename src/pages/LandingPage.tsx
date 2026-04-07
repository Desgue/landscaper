import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import OutputGallery from '../components/OutputGallery'
import HowItWorks from '../components/HowItWorks'
import TrustBar from '../components/TrustBar'
import Pricing from '../components/Pricing'
import CTABanner from '../components/CTABanner'
import Footer from '../components/Footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg font-sans text-text">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary">
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content">
        <Hero />
        <OutputGallery />
        <HowItWorks />
        <TrustBar />
        <Pricing />
        <CTABanner />
      </main>
      <Footer />
    </div>
  )
}
