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
            className="inline-block bg-accent hover:bg-accent-hover text-text font-semibold px-8 py-3.5 rounded-lg text-base transition-all shadow-sm hover:shadow-md"
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
        <TransformationPreview />
      </div>
    </section>
  )
}

function TransformationPreview() {
  return (
    <div className="rounded-xl border border-border bg-bg-card shadow-lg overflow-hidden">
      {/* Plan panel */}
      <div className="p-4 pb-2">
        {/* Fake toolbar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
          </div>
          <span className="text-[10px] text-text-muted font-medium ml-1">Your layout</span>
        </div>

        <div className="bg-bg-alt rounded-lg relative overflow-hidden" style={{ height: 160 }}>
          {/* Dot grid */}
          <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="prev-dots" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="8" cy="8" r="0.6" fill="#8A8D84" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#prev-dots)" />
          </svg>

          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 360 160" xmlns="http://www.w3.org/2000/svg">
            {/* Boundary */}
            <rect x="16" y="12" width="328" height="136" rx="4"
              fill="none" stroke="#2D6A4F" strokeWidth="1.2" strokeDasharray="5,3" />
            {/* Lawn */}
            <rect x="24" y="20" width="312" height="120" rx="3"
              fill="#bbf7d0" fillOpacity="0.45" />
            {/* Patio */}
            <rect x="32" y="90" width="80" height="44" rx="2"
              fill="#d1d5db" fillOpacity="0.6" stroke="#9ca3af" strokeWidth="0.8" />
            {/* Planting bed */}
            <rect x="200" y="24" width="120" height="40" rx="3"
              fill="#a16207" fillOpacity="0.2" stroke="#a16207" strokeWidth="1" />
            {/* Walkway */}
            <rect x="150" y="60" width="10" height="86" rx="2"
              fill="#d1d5db" fillOpacity="0.7" />
            {/* Tree */}
            <circle cx="70" cy="48" r="22" fill="#4ade80" fillOpacity="0.25" />
            <circle cx="70" cy="48" r="3.5" fill="#713f12" />
            {/* Tree 2 */}
            <circle cx="280" cy="110" r="16" fill="#4ade80" fillOpacity="0.25" />
            <circle cx="280" cy="110" r="2.5" fill="#713f12" />
            {/* Herbs in bed */}
            {[[212, 36], [232, 36], [252, 36], [272, 36], [212, 52], [232, 52], [252, 52], [272, 52]].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="5.5" fill="#16a34a" fillOpacity="0.55" />
            ))}
            {/* Fence */}
            <line x1="16" y1="12" x2="344" y2="12" stroke="#78716c" strokeWidth="2" />
          </svg>
        </div>
      </div>

      {/* AI connector strip */}
      <div className="flex items-center justify-center gap-3 py-3 bg-bg-alt/50">
        <div className="h-px flex-1 bg-border ml-4" />
        <div
          className="w-10 h-10 rounded-full bg-bg-alt flex items-center justify-center shrink-0"
          style={{ animation: 'pulse-glow 2.5s ease-in-out infinite' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" fill="#2D6A4F" />
            <path d="M19 14L19.75 16.25L22 17L19.75 17.75L19 20L18.25 17.75L16 17L18.25 16.25L19 14Z" fill="#2D6A4F" fillOpacity="0.5" />
          </svg>
        </div>
        <div className="h-px flex-1 bg-border mr-4" />
      </div>

      {/* Render panel */}
      <div className="p-4 pt-2">
        <div
          className="rounded-lg relative overflow-hidden"
          style={{
            height: 160,
            background: 'linear-gradient(180deg, #bae6fd 0%, #7dd3fc 20%, #6ab04c 20%, #4a8c3f 55%, #3d7a35 100%)',
            boxShadow: 'inset 0 0 30px rgba(0,0,0,0.08)',
          }}
        >
          {/* Golden hour overlay */}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.06) 40%, transparent 100%)' }} />

          {/* Sun */}
          <div className="absolute top-2 right-6 w-6 h-6 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.6) 0%, transparent 70%)' }} />

          {/* Clouds */}
          <div className="absolute top-3 left-10 w-12 h-2 rounded-full bg-white/30"
            style={{ animation: 'float 5s ease-in-out infinite' }} />
          <div className="absolute top-5 left-20 w-8 h-1.5 rounded-full bg-white/20"
            style={{ animation: 'float 5s ease-in-out infinite 1s' }} />

          {/* Fence */}
          <div className="absolute top-[20%] left-3 right-3 h-[2.5px] rounded-full"
            style={{ background: 'linear-gradient(90deg, #8b7355, #a08966, #8b7355)', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }}>
            {[8, 20, 32, 44, 56, 68, 80, 92].map(pct => (
              <div key={pct} className="absolute -top-1 w-[2.5px] h-[5px] rounded-sm"
                style={{ left: `${pct}%`, background: '#6b5a42' }} />
            ))}
          </div>

          {/* Tree 1 */}
          <div className="absolute top-[18%] left-[12%]">
            <div className="w-2 h-5 mx-auto rounded-sm" style={{ background: '#5a3e1b' }} />
            <div className="w-12 h-12 rounded-full -mt-3"
              style={{ background: 'radial-gradient(circle at 40% 35%, #6bc04c, #4a8c3f 50%, #3d7530)', boxShadow: '2px 3px 6px rgba(0,0,0,0.2)' }} />
          </div>

          {/* Tree 2 */}
          <div className="absolute top-[50%] right-[8%]">
            <div className="w-1.5 h-3 mx-auto rounded-sm" style={{ background: '#5a3e1b' }} />
            <div className="w-9 h-9 rounded-full -mt-2"
              style={{ background: 'radial-gradient(circle at 40% 35%, #7acc5c, #52994a 50%, #3d7530)', boxShadow: '2px 3px 5px rgba(0,0,0,0.18)' }} />
          </div>

          {/* Patio */}
          <div className="absolute bottom-3 left-4 w-[70px] h-[40px] rounded-sm"
            style={{ background: 'linear-gradient(135deg, #d4a574, #c4956a, #b8865c)', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15), 0 2px 4px rgba(0,0,0,0.12)' }}>
            <div className="absolute inset-0 opacity-15"
              style={{ backgroundImage: 'linear-gradient(90deg, #8b6f47 1px, transparent 1px), linear-gradient(#8b6f47 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
          </div>

          {/* Walkway */}
          <div className="absolute left-[42%] top-[24%] w-[9px] h-[72%] rounded-sm"
            style={{ background: 'linear-gradient(180deg, #c9b896, #b8a685)', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }} />

          {/* Planting bed */}
          <div className="absolute top-[15%] right-[14%] w-[70px] h-[28px] rounded"
            style={{ background: 'linear-gradient(135deg, #6b3a2a, #5c3322)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.25)' }}>
            <div className="absolute top-0.5 left-1.5 w-2.5 h-2.5 rounded-full bg-pink-400/80" />
            <div className="absolute top-1 left-5 w-2 h-2 rounded-full bg-yellow-400/80" />
            <div className="absolute top-0 left-8 w-2.5 h-2.5 rounded-full bg-purple-400/70" />
            <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-red-400/70" />
            <div className="absolute top-3.5 left-7 w-1.5 h-1.5 rounded-full bg-pink-300/80" />
            <div className="absolute top-0.5 right-2 w-2 h-2 rounded-full bg-yellow-300/70" />
          </div>

          {/* Depth gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-6"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.08), transparent)' }} />

          {/* Style chip */}
          <div className="absolute bottom-1.5 right-1.5 bg-white/70 backdrop-blur-sm rounded px-1.5 py-0.5">
            <p className="text-[8px] text-text-muted font-medium">Contemporary &middot; Autumn &middot; Golden hour</p>
          </div>
        </div>
      </div>
    </div>
  )
}
