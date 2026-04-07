import { useInView } from '../hooks/useInView'

export default function CTABanner() {
  const { ref, isInView } = useInView({ rootMargin: '0px 0px -40px 0px' })

  return (
    <section id="get-started" aria-labelledby="cta-heading" className="relative overflow-hidden bg-primary py-16 px-6">
      {/* Topographic contour pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 280px 180px at 25% 40%, transparent 40%, rgba(255,255,255,0.35) 41%, transparent 42%),
            radial-gradient(ellipse 220px 160px at 65% 25%, transparent 35%, rgba(255,255,255,0.25) 36%, transparent 37%),
            radial-gradient(ellipse 320px 200px at 50% 75%, transparent 45%, rgba(255,255,255,0.3) 46%, transparent 47%),
            radial-gradient(ellipse 180px 120px at 80% 65%, transparent 38%, rgba(255,255,255,0.2) 39%, transparent 40%),
            radial-gradient(ellipse 260px 170px at 15% 80%, transparent 42%, rgba(255,255,255,0.28) 43%, transparent 44%)
          `,
          backgroundSize: '400px 280px, 320px 240px, 450px 300px, 280px 200px, 380px 260px',
        }}
      />

      <div
        ref={ref}
        className={`relative max-w-3xl mx-auto text-center ${isInView ? 'animate-fade-up' : 'opacity-0'}`}
      >
        <h2 id="cta-heading" className="text-2xl sm:text-3xl font-bold text-white mb-4">
          Visualize Your Yard Before You Build — Free, No Signup
        </h2>
        <p className="text-white/80 mb-8 max-w-md mx-auto">
          No account needed to start. Takes 60 seconds to see your first result.
        </p>
        <a
          href="/app"
          className="inline-flex items-center justify-center w-full sm:w-auto bg-accent hover:bg-accent-hover text-text font-semibold px-8 py-3.5 rounded-lg text-base transition-colors shadow-md hover:shadow-lg min-h-[44px]"
        >
          Start designing for free <span aria-hidden="true">&rarr;</span>
        </a>
      </div>
    </section>
  )
}
