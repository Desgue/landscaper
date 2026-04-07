import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import Gallery from './components/Gallery'
import HowItWorks from './components/HowItWorks'
import Footer from './components/Footer'
import './index.css'

export default function App() {
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
