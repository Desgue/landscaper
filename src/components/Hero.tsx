import { useRef, useState, useCallback } from 'react'
import { useInView } from '../hooks/useInView'

export default function Hero() {
  const { ref, isInView } = useInView({ threshold: 0.1 })

  return (
    <section id="hero" aria-label="Hero" ref={ref} className="relative overflow-hidden bg-bg pt-24 pb-20 px-6">
      {/* Subtle dot grid background */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <pattern id="hero-dots" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="1" fill="#2D6A4F" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-dots)" />
      </svg>

      {/* Centered copy */}
      <div className="relative max-w-4xl mx-auto text-center">
        {/* Trust badge */}
        <div
          className={`inline-flex items-center gap-2 bg-bg-alt text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-primary/15 animate-on-scroll ${isInView ? 'animate-fade-up' : ''}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
          Free to Start. No Account. Works in Your Browser.
        </div>

        {/* H1 */}
        <h1
          className={`text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6 animate-on-scroll animate-delay-100 ${isInView ? 'animate-fade-up' : ''}`}
        >
          <span className="text-text">Free Online Landscape Planner</span>
          <br />
          <span className="text-primary">Draw Your Yard, See It Built</span>
        </h1>

        {/* Subtext */}
        <p
          className={`text-lg text-text-secondary max-w-2xl mx-auto mb-8 leading-relaxed animate-on-scroll animate-delay-200 ${isInView ? 'animate-fade-up' : ''}`}
        >
          Sketch your yard with plants, paths, and structures. Upload a real photo.
          Hit generate — and get an AI-rendered image of your finished landscape.
        </p>

        {/* CTA button */}
        <div className={`animate-on-scroll animate-delay-300 ${isInView ? 'animate-fade-up' : ''}`}>
          <a
            href="/app"
            className="inline-flex items-center justify-center w-full sm:w-auto bg-accent-hover hover:brightness-95 text-text font-semibold px-8 py-3.5 rounded-lg text-base transition-all shadow-sm hover:shadow-md min-h-[44px]"
          >
            Start planning — it's free <span aria-hidden="true">&rarr;</span>
          </a>
          <p className="text-sm text-text-muted mt-3">
            No signup, no download. Opens instantly.
          </p>
        </div>
      </div>

      {/* Transformation preview */}
      <div aria-hidden="true" className={`relative max-w-3xl mx-auto mt-14 animate-on-scroll animate-delay-400 ${isInView ? 'animate-fade-up' : ''}`}>
        <TransformationPreview isInView={isInView} />
      </div>
    </section>
  )
}

function TransformationPreview({ isInView }: { isInView: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef(50)
  const currentRef = useRef(50)
  const rafRef = useRef<number>(0)
  const [position, setPosition] = useState(50)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [introComplete, setIntroComplete] = useState(false)

  // Smooth lerp animation loop — eases toward target instead of snapping
  const startLerp = useCallback(() => {
    if (rafRef.current) return
    const tick = () => {
      const diff = targetRef.current - currentRef.current
      if (Math.abs(diff) < 0.1) {
        currentRef.current = targetRef.current
        setPosition(currentRef.current)
        rafRef.current = 0
        return
      }
      currentRef.current += diff * 0.12 // smoothing factor — lower = smoother
      setPosition(currentRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const handleMove = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    targetRef.current = (x / rect.width) * 100
    if (!hasInteracted) setHasInteracted(true)
    startLerp()
  }, [hasInteracted, startLerp])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    handleMove(e.clientX)
  }, [handleMove])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX)
  }, [handleMove])

  const onAnimationEnd = useCallback(() => {
    setIntroComplete(true)
  }, [])

  const isInteractive = introComplete || hasInteracted
  const clipValue = `inset(0 ${100 - position}% 0 0)`

  return (
    <div className="rounded-xl border border-border bg-bg-card shadow-lg overflow-hidden">
      <div
        ref={containerRef}
        className="relative select-none"
        style={{ cursor: isInteractive ? 'col-resize' : 'default' }}
        onMouseMove={onMouseMove}
        onTouchMove={onTouchMove}
      >
        {/* Before */}
        <img
          src="/images/hero/before.jpeg"
          alt="Yard photo before landscaping"
          className="w-full h-64 sm:h-80 object-cover"
          width={1200}
          height={1600}
          draggable={false}
          fetchPriority="high"
        />
        <span className="absolute bottom-3 left-3 text-[11px] font-medium text-white/70 z-10">
          Before
        </span>

        {/* After — clip-path reveal */}
        <div
          className={`absolute inset-0 ${!isInteractive && isInView ? 'animate-wipe-reveal animate-delay-800' : ''}`}
          style={isInteractive ? { clipPath: clipValue } : !isInView ? { clipPath: 'inset(0 100% 0 0)' } : undefined}
          onAnimationEnd={onAnimationEnd}
        >
          <img
            src="/images/hero/after.png"
            alt="AI-generated landscape design of the same yard"
            className="w-full h-full object-cover"
            width={1376}
            height={768}
            draggable={false}
            fetchPriority="high"
          />
          <span className="absolute bottom-3 right-3 text-[11px] font-medium text-white/70">
            After
          </span>
        </div>

        {/* Divider — thin translucent line, no handle */}
        {isInteractive && (
          <div
            className="absolute top-0 bottom-0 z-20 pointer-events-none"
            style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
          >
            <div className="w-px h-full bg-white/40" />
          </div>
        )}
      </div>

      {/* Bottom strip */}
      <div className="flex items-center justify-center gap-3 py-2.5 bg-bg-alt/50 px-4">
        <div className="h-px flex-1 bg-border" />
        <p className="text-[11px] text-text-muted font-medium tracking-wide">
          {isInteractive ? 'Move to compare' : 'Same yard. One click.'}
        </p>
        <div className="h-px flex-1 bg-border" />
      </div>
    </div>
  )
}
