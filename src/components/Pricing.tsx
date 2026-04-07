import { useInView } from '../hooks/useInView'

const checkIcon = (
  <svg
    aria-hidden="true"
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    className="shrink-0 text-primary"
  >
    <path
      d="M4 9.5L7.5 13L14 5.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const freePlanFeatures = [
  'Draw unlimited yard layouts',
  'Place plants, structures & paths',
  'Paint terrain zones',
  'Save plans in your browser',
  'Export as PNG',
]

const proPlanFeatures = [
  'Everything in Free, plus:',
  'AI landscape image generation',
  'All styles (contemporary, cottage, Japanese...)',
  'Season & time-of-day control',
  'Upload yard photos as reference',
  'Priority rendering',
  'Download high-res images',
]

export default function Pricing() {
  const { ref: headerRef, isInView: headerInView } = useInView()
  const { ref: cardsRef, isInView: cardsInView } = useInView({ threshold: 0.05 })

  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="bg-bg py-24 px-6 border-t border-border">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div
          ref={headerRef}
          className={`text-center mb-14 ${headerInView ? 'animate-fade-up' : 'opacity-0'}`}
        >
          <h2 id="pricing-heading" className="text-3xl sm:text-4xl font-bold tracking-tight text-text mb-3">
            Simple, Transparent Pricing
          </h2>
          <p className="text-text-secondary text-base max-w-lg mx-auto">
            Start designing for free. Upgrade when you're ready to see your yard come to life.
          </p>
        </div>

        {/* Cards */}
        <div
          ref={cardsRef}
          className={`grid md:grid-cols-2 gap-8 max-w-3xl mx-auto items-stretch ${
            cardsInView ? 'animate-fade-up animate-delay-200' : 'opacity-0'
          }`}
        >
          {/* Free Plan */}
          <div className="bg-bg-card rounded-xl border border-border shadow-sm p-8 flex flex-col">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-text">Free</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-text">$0</span>
              </div>
              <p className="mt-2 text-sm text-text-secondary">Perfect for planning</p>
            </div>

            <ul className="flex flex-col gap-3 mb-8 flex-1">
              {freePlanFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-text-secondary">
                  {checkIcon}
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <a
              href="/app"
              className="block w-full text-center border-2 border-primary text-primary font-semibold py-3 rounded-lg transition-colors hover:bg-primary hover:text-white"
            >
              Start for free
            </a>
          </div>

          {/* Pro Plan */}
          <div className="relative bg-bg-card rounded-xl ring-2 ring-primary shadow-lg p-8 flex flex-col">
            {/* Badge */}
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
              Most Popular
            </span>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-text">Pro</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-text">$9</span>
                <span className="text-sm text-text-muted">/month</span>
              </div>
              <p className="mt-2 text-sm text-text-secondary">
                See your yard before you build it
              </p>
            </div>

            <ul className="flex flex-col gap-3 mb-8 flex-1">
              {proPlanFeatures.map((feature, i) => (
                <li
                  key={feature}
                  className={`flex items-start gap-2.5 text-sm ${
                    i === 0 ? 'text-text font-medium' : 'text-text-secondary'
                  }`}
                >
                  {checkIcon}
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <a
              href="/app"
              className="block w-full text-center bg-accent hover:bg-accent-hover text-text font-semibold py-3 rounded-lg transition-colors"
            >
              Start free trial
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
