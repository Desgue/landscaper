export default function Hero() {
  return (
    <section
      className="relative overflow-hidden bg-white pt-20 pb-20 px-6"
      style={{
        background: 'radial-gradient(ellipse at 20% 50%, rgba(25,113,194,0.05) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(74,222,128,0.04) 0%, transparent 50%), #ffffff',
      }}
    >
      {/* Subtle dot grid background */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hero-dots" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="1" fill="#1971c2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-dots)" />
      </svg>

      <div className="relative max-w-6xl mx-auto grid md:grid-cols-[1fr_1.2fr] gap-12 items-center">
        {/* Left column — copy */}
        <div>
          <div className="inline-flex items-center gap-2 bg-[#e8f0fb] text-[#1971c2] text-sm font-medium px-3 py-1 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1971c2] inline-block" />
            Free. No account. Runs in your browser.
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-tight mb-5">
            Draw your yard.
            <br />
            <span className="text-[#1971c2]">See it finished.</span>
          </h1>

          <p className="text-lg text-gray-500 max-w-md mb-8 leading-relaxed">
            Lay out plants, walkways, and structures on a canvas. Upload a yard
            photo. Hit generate and get a realistic image of the finished
            landscape in any style or season.
          </p>

          <div>
            <a
              href="/app"
              className="inline-block bg-[#1971c2] hover:bg-[#1562a8] text-white font-semibold px-8 py-3.5 rounded-lg text-base transition-colors shadow-sm"
            >
              Open the canvas &rarr;
            </a>
            <p className="text-sm text-gray-400 mt-3">
              No signup, no install. Opens right here.
            </p>
          </div>
        </div>

        {/* Right column — transformation preview */}
        <TransformationPreview />
      </div>
    </section>
  )
}

function TransformationPreview() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
      {/* Plan panel */}
      <div className="p-4 pb-2">
        {/* Fake toolbar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-300" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
          </div>
          <span className="text-[10px] text-gray-400 font-medium ml-1">Your layout</span>
        </div>

        <div className="bg-gray-50 rounded-lg relative overflow-hidden" style={{ height: 160 }}>
          {/* Dot grid */}
          <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="prev-dots" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="8" cy="8" r="0.6" fill="#94a3b8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#prev-dots)" />
          </svg>

          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 360 160" xmlns="http://www.w3.org/2000/svg">
            {/* Boundary */}
            <rect x="16" y="12" width="328" height="136" rx="4"
              fill="none" stroke="#1971c2" strokeWidth="1.2" strokeDasharray="5,3" />
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
      <div className="flex items-center justify-center gap-3 py-3 bg-gray-50/50">
        <div className="h-px flex-1 bg-gray-200 ml-4" />
        <div
          className="w-10 h-10 rounded-full bg-[#e8f0fb] flex items-center justify-center shrink-0"
          style={{ animation: 'pulse-glow 2.5s ease-in-out infinite' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" fill="#1971c2" />
            <path d="M19 14L19.75 16.25L22 17L19.75 17.75L19 20L18.25 17.75L16 17L18.25 16.25L19 14Z" fill="#1971c2" fillOpacity="0.5" />
          </svg>
        </div>
        <div className="h-px flex-1 bg-gray-200 mr-4" />
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
            <p className="text-[8px] text-gray-500 font-medium">Contemporary &middot; Autumn &middot; Golden hour</p>
          </div>
        </div>
      </div>
    </div>
  )
}
