import { useInView } from '../hooks/useInView'

const signals = [
  {
    text: 'No account needed',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    text: 'Free plan available',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    text: 'Runs in your browser',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
]

const trustStaggerDelays = ['', 'animate-delay-100', 'animate-delay-200']

export default function TrustBar() {
  const { ref, isInView } = useInView({ threshold: 0.2, rootMargin: '0px 0px -40px 0px' })

  return (
    <section id="trust" aria-labelledby="trust-heading" ref={ref} className="bg-bg-alt py-8 px-6">
      <h2 id="trust-heading" className="sr-only">Why choose Greenprint</h2>
      <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-8 sm:gap-12">
        {signals.map((signal, i) => (
          <div
            key={signal.text}
            className={`flex items-center gap-2.5 text-sm text-text-secondary animate-on-scroll ${trustStaggerDelays[i]} ${
              isInView ? 'animate-fade-up' : ''
            }`}
          >
            {signal.icon}
            {signal.text}
          </div>
        ))}
      </div>
    </section>
  )
}
