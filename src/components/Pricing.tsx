import { useState } from 'react'
import { useInView } from '../hooks/useInView'

type BillingPeriod = 'monthly' | 'annual'

interface Plan {
  id: string
  name: string
  tagline: string
  monthlyPrice: number
  annualMonthly: number
  annualTotal: number
  features: string[]
  cta: string
  ctaHref: string
  highlighted: boolean
  badge?: string
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Start designing your yard for free.',
    monthlyPrice: 0,
    annualMonthly: 0,
    annualTotal: 0,
    features: [
      'Draw unlimited yard layouts',
      'Paint terrain, place plants & structures',
      'Export designs as PNG',
      '3 AI renders/month at 1K resolution',
    ],
    cta: 'Start free',
    ctaHref: '/app',
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For gardeners who bring designs to life.',
    monthlyPrice: 10,
    annualMonthly: 7,
    annualTotal: 79,
    features: [
      'Everything in Free, plus:',
      'Upload yard photos as AI reference',
      '25 AI renders/month at 2K quality',
      'All design styles (cottage, Japanese…)',
      'Season & time-of-day control',
      'Save 5 custom style presets',
      'Cloud backup with 30-day history',
    ],
    cta: 'Start free trial',
    ctaHref: '/app',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    id: 'studio',
    name: 'Studio',
    tagline: 'For landscapers who impress clients.',
    monthlyPrice: 40,
    annualMonthly: 33,
    annualTotal: 399,
    features: [
      'Everything in Pro, plus:',
      '100 AI renders/month at 4K resolution',
      'Invite 2 team members (+$10/seat)',
      'Export designs as PDF portfolios',
      'Password-protected client galleries',
      'Unlimited project versions & archives',
      'Custom watermark on renders',
    ],
    cta: 'Start Studio trial',
    ctaHref: '/app',
    highlighted: false,
  },
]

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

function BillingToggle({
  billing,
  onChange,
}: {
  billing: BillingPeriod
  onChange: (b: BillingPeriod) => void
}) {
  const isAnnual = billing === 'annual'

  return (
    <div
      role="group"
      aria-label="Billing period"
      className="flex items-center justify-center gap-3"
    >
      <button
        type="button"
        aria-pressed={!isAnnual}
        onClick={() => onChange('monthly')}
        className={`text-sm font-medium transition-colors ${
          !isAnnual ? 'text-text' : 'text-text-muted hover:text-text-secondary'
        }`}
      >
        Monthly
      </button>

      <button
        type="button"
        role="switch"
        aria-checked={isAnnual}
        aria-label="Toggle annual billing"
        onClick={() => onChange(isAnnual ? 'monthly' : 'annual')}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          isAnnual ? 'bg-primary' : 'bg-border'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            isAnnual ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>

      <button
        type="button"
        aria-pressed={isAnnual}
        onClick={() => onChange('annual')}
        className={`text-sm font-medium transition-colors ${
          isAnnual ? 'text-text' : 'text-text-muted hover:text-text-secondary'
        }`}
      >
        Annual
      </button>

      <span className="bg-accent-light text-warning text-xs font-semibold px-2 py-0.5 rounded-full">
        Save up to 35%
      </span>
    </div>
  )
}

function PlanCard({ plan, billing }: { plan: Plan; billing: BillingPeriod }) {
  const price = billing === 'annual' ? plan.annualMonthly : plan.monthlyPrice
  const isFree = plan.monthlyPrice === 0
  const isAnnual = billing === 'annual'

  return (
    <div
      className={`relative flex flex-col rounded-xl p-8 ${
        plan.highlighted
          ? 'bg-bg-card ring-2 ring-primary shadow-lg'
          : 'bg-bg-card border border-border shadow-sm'
      }`}
    >
      {plan.badge && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
          {plan.badge}
        </span>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-text">{plan.name}</h3>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-4xl font-bold text-text">
            ${price}
          </span>
          {!isFree && (
            <span className="text-sm text-text-muted">/mo</span>
          )}
        </div>
        {!isFree && isAnnual && (
          <p className="mt-1 text-xs text-primary font-medium">
            Billed ${plan.annualTotal}/yr — Save ${plan.monthlyPrice * 12 - plan.annualTotal}/yr
          </p>
        )}
        {isFree && (
          <p className="mt-1 text-xs text-text-muted">Free forever</p>
        )}
        <p className="mt-2 text-sm text-text-secondary">{plan.tagline}</p>
      </div>

      <ul className="flex flex-col gap-3 mb-8 flex-1">
        {plan.features.map((feature, i) => (
          <li
            key={feature}
            className={`flex items-start gap-2.5 text-sm ${
              i === 0 && feature.includes('Everything')
                ? 'text-text font-medium'
                : 'text-text-secondary'
            }`}
          >
            {checkIcon}
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <a
        href={plan.ctaHref}
        className={`block w-full text-center font-semibold py-3 rounded-lg transition-colors ${
          plan.highlighted
            ? 'bg-accent hover:bg-accent-hover text-text'
            : 'border-2 border-primary text-primary hover:bg-primary hover:text-white'
        }`}
      >
        {plan.cta}
      </a>
    </div>
  )
}

export default function Pricing() {
  const [billing, setBilling] = useState<BillingPeriod>('monthly')
  const { ref: headerRef, isInView: headerInView } = useInView()
  const { ref: toggleRef, isInView: toggleInView } = useInView()
  const { ref: cardsRef, isInView: cardsInView } = useInView({ threshold: 0.05 })

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="bg-bg py-24 px-6 border-t border-border"
    >
      <div className="max-w-5xl mx-auto">
        <div
          ref={headerRef}
          className={`text-center mb-8 ${headerInView ? 'animate-fade-up' : 'opacity-0'}`}
        >
          <h2
            id="pricing-heading"
            className="text-3xl sm:text-4xl font-bold tracking-tight text-text mb-3"
          >
            Simple, Transparent Pricing
          </h2>
          <p className="text-text-secondary text-base max-w-lg mx-auto">
            Start designing for free. Upgrade when you're ready to see your yard come to life.
          </p>
        </div>

        <div
          ref={toggleRef}
          className={`mb-12 ${toggleInView ? 'animate-fade-up animate-delay-100' : 'opacity-0'}`}
        >
          <BillingToggle billing={billing} onChange={setBilling} />
        </div>

        <div
          ref={cardsRef}
          className={`grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start ${
            cardsInView ? 'animate-fade-up animate-delay-200' : 'opacity-0'
          }`}
        >
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} billing={billing} />
          ))}
        </div>

        <p className="text-center text-sm text-text-muted mt-8">
          All paid plans include a 7-day free trial. Pause or cancel anytime.
        </p>
      </div>
    </section>
  )
}
