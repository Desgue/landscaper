import { useInView } from '../hooks/useInView'

const steps = [
  {
    number: 1,
    title: 'Draw Your Yard Layout',
    description:
      'Set your yard boundary, paint in terrain — grass, gravel, mulch — and place plants, structures, and paths. Upload a photo of your real yard so the AI knows what it\'s working with.',
    imagePosition: 'left' as const,
  },
  {
    number: 2,
    title: 'Set Your Landscape Style',
    description:
      'Choose a style — contemporary, cottage, Japanese, tropical, or formal. Set the season and time of day. Pick eye-level for a walkthrough view or overhead to see the full plan.',
    imagePosition: 'right' as const,
  },
  {
    number: 3,
    title: 'Generate a Realistic Landscape Image',
    description:
      'One click. Greenprint turns your layout into an image that looks like a photo of the finished landscape. Download it, share it, or tweak your plan and generate again.',
    imagePosition: 'left' as const,
  },
]

function StepPlaceholder1() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Mini canvas background */}
      <div className="absolute inset-4 rounded-lg bg-bg-alt/50" />

      {/* Dotted yard boundary */}
      <svg className="absolute inset-6" viewBox="0 0 300 200" fill="none">
        <rect
          x="30" y="20" width="240" height="160" rx="8"
          stroke="#2D6A4F" strokeWidth="2" strokeDasharray="8 4"
          fill="none" opacity="0.6"
        />
        {/* Grass area */}
        <rect x="50" y="50" width="80" height="60" rx="4" fill="#40916C" opacity="0.45" />
        {/* Gravel path */}
        <rect x="140" y="80" width="60" height="20" rx="3" fill="#8A8D84" opacity="0.5" />
        {/* Plants */}
        <circle cx="100" cy="140" r="10" fill="#2D6A4F" opacity="0.55" />
        <circle cx="130" cy="130" r="8" fill="#40916C" opacity="0.55" />
        <circle cx="200" cy="60" r="12" fill="#2D6A4F" opacity="0.5" />
        {/* Structure */}
        <rect x="180" y="110" width="50" height="40" rx="3" fill="#D4DDD0" opacity="0.7" />
        {/* Mulch area */}
        <rect x="50" y="120" width="40" height="30" rx="4" fill="#E8A838" opacity="0.4" />
      </svg>

      {/* Toolbar hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
        {['bg-primary/30', 'bg-primary-light/30', 'bg-text-muted/30', 'bg-accent/30'].map((bg, i) => (
          <div key={i} className={`w-7 h-7 rounded ${bg} border border-border/50`} />
        ))}
      </div>
    </div>
  )
}

function StepPlaceholder2() {
  const styles = ['Contemporary', 'Cottage', 'Japanese', 'Tropical', 'Formal']
  const seasons = ['Spring', 'Summer', 'Autumn', 'Winter']
  const times = ['Morning', 'Afternoon', 'Golden Hour']
  const views = ['Eye-level', 'Overhead']

  const selectedStyle = 0
  const selectedSeason = 1
  const selectedTime = 1
  const selectedView = 0

  const chipSelected = 'bg-primary text-white border border-primary'
  const chipDefault = 'bg-bg-card border border-border text-text-secondary'

  return (
    <div className="relative w-full h-full flex flex-col p-5 gap-0">
      {/* Header bar */}
      <div className="flex items-center gap-2 pb-3 mb-4 border-b border-border">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-primary">
          <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="5" cy="4" r="1.5" fill="currentColor" />
          <circle cx="10" cy="8" r="1.5" fill="currentColor" />
          <circle cx="7" cy="12" r="1.5" fill="currentColor" />
        </svg>
        <span className="text-sm font-semibold text-text">Generation Options</span>
      </div>

      {/* Style group */}
      <div className="flex flex-col gap-1.5 mb-4">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Style</span>
        <div className="flex flex-wrap gap-1.5">
          {styles.map((style, i) => (
            <div
              key={style}
              className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium text-center ${
                i === selectedStyle ? chipSelected : chipDefault
              }`}
            >
              {style}
            </div>
          ))}
        </div>
      </div>

      {/* Season group */}
      <div className="flex flex-col gap-1.5 mb-4">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Season</span>
        <div className="flex flex-wrap gap-1.5">
          {seasons.map((season, i) => (
            <div
              key={season}
              className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium text-center ${
                i === selectedSeason ? chipSelected : chipDefault
              }`}
            >
              {season}
            </div>
          ))}
        </div>
      </div>

      {/* Time of Day group */}
      <div className="flex flex-col gap-1.5 mb-4">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Time of Day</span>
        <div className="flex flex-wrap gap-1.5">
          {times.map((time, i) => (
            <div
              key={time}
              className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium text-center ${
                i === selectedTime ? chipSelected : chipDefault
              }`}
            >
              {time}
            </div>
          ))}
        </div>
      </div>

      {/* View group */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">View</span>
        <div className="flex flex-wrap gap-1.5">
          {views.map((view, i) => (
            <div
              key={view}
              className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium text-center ${
                i === selectedView ? chipSelected : chipDefault
              }`}
            >
              {view}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StepPlaceholder3() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-5 p-6">
      {/* Generate button */}
      <div aria-hidden="true" className="bg-accent text-text font-semibold px-6 py-2.5 rounded-lg text-sm shadow-sm flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
          <path d="M8 1l1.5 3.5L13 6l-3.5 1.5L8 11 6.5 7.5 3 6l3.5-1.5L8 1z" fill="#1A1D1A" opacity="0.7" />
          <path d="M12 9l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" fill="#1A1D1A" opacity="0.5" />
        </svg>
        Generate
      </div>

      {/* Result preview area */}
      <div className="w-full max-w-[240px] aspect-[16/10] rounded-lg overflow-hidden border border-border/50 shadow-inner">
        <div
          className="w-full h-full"
          style={{
            background: `linear-gradient(180deg, #87CEEB 0%, #87CEEB 35%, #40916C 35%, #2D6A4F 60%, #5C6356 60%, #D4DDD0 100%)`,
            opacity: 0.65,
          }}
        />
      </div>

      <span className="text-[10px] text-text-muted">Your landscape, visualized</span>
    </div>
  )
}

const placeholders = [StepPlaceholder1, StepPlaceholder2, StepPlaceholder3]

function StepRow({ step, index }: { step: typeof steps[0]; index: number }) {
  const { ref, isInView } = useInView({ threshold: 0.15, rootMargin: '0px 0px -60px 0px' })
  const Placeholder = placeholders[index]
  const imageOnLeft = step.imagePosition === 'left'

  return (
    <div ref={ref} className={`grid md:grid-cols-2 gap-10 items-center ${isInView ? '' : 'animate-on-scroll'}`}>
      {/* Image side (decorative) */}
      <div
        aria-hidden="true"
        className={`bg-bg-card rounded-xl border border-border shadow-sm p-6 aspect-[4/3] ${
          !imageOnLeft ? 'md:order-2' : ''
        } ${isInView ? (imageOnLeft ? 'animate-slide-in-left' : 'animate-slide-in-right') : 'opacity-0'}`}
      >
        <Placeholder />
      </div>

      {/* Text side */}
      <div
        className={`${!imageOnLeft ? 'md:order-1' : ''} ${
          isInView ? 'animate-fade-up animate-delay-200' : 'opacity-0'
        }`}
      >
        <span className="text-sm font-semibold text-primary">Step {step.number}</span>
        <h3 className="text-2xl font-bold text-text mt-1 mb-3">{step.title}</h3>
        <p className="text-text-secondary leading-relaxed">{step.description}</p>
      </div>
    </div>
  )
}

export default function HowItWorks() {
  const { ref: headerRef, isInView: headerInView } = useInView({ rootMargin: '0px 0px -40px 0px' })

  return (
    <section id="how-it-works" aria-labelledby="how-it-works-heading" className="relative bg-bg py-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div
          ref={headerRef}
          className={`text-center mb-16 ${headerInView ? 'animate-fade-up' : 'opacity-0'}`}
        >
          <h2 id="how-it-works-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-text mb-3">
            Plan Your Garden Layout in Three Steps
          </h2>
          <p className="text-text-secondary text-base max-w-lg mx-auto">
            From blank canvas to realistic landscape image in under a minute.
          </p>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-20">
          {steps.map((step, i) => (
            <StepRow key={step.number} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
