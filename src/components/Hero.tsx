export default function Hero() {
  return (
    <section className="bg-white pt-24 pb-20 px-6 text-center">
      <div className="max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-[#e8f0fb] text-[#1971c2] text-sm font-medium px-3 py-1 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1971c2] inline-block" />
          Free to use &mdash; no account required
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-gray-900 leading-tight mb-6">
          Design your landscape,
          <br />
          <span className="text-[#1971c2]">down to the last detail.</span>
        </h1>

        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
          Greenprint is a canvas-based landscape design tool. Map terrain, place
          plants and structures, measure real-world distances, and track your
          project over time — all in your browser.
        </p>

        <a
          href="#"
          className="inline-block bg-[#1971c2] hover:bg-[#1562a8] text-white font-semibold px-8 py-3.5 rounded-lg text-base transition-colors shadow-sm"
        >
          Start planning &rarr;
        </a>
      </div>

      {/* Canvas preview illustration */}
      <div className="mt-16 max-w-4xl mx-auto">
        <CanvasPreview />
      </div>
    </section>
  )
}

function CanvasPreview() {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 shadow-lg overflow-hidden">
      {/* Fake toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex gap-1 ml-4">
          {['V', 'B', 'P', 'S', 'M'].map((key) => (
            <div
              key={key}
              className={`w-7 h-7 rounded text-xs flex items-center justify-center font-mono font-medium ${
                key === 'P'
                  ? 'bg-[#1971c2] text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {key}
            </div>
          ))}
        </div>
      </div>

      {/* Fake canvas */}
      <div className="relative h-72 sm:h-96 bg-gray-50 overflow-hidden">
        {/* Grid lines */}
        <svg
          className="absolute inset-0 w-full h-full opacity-30"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="0.5"
                strokeDasharray="2,2"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Yard boundary */}
        <svg
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Lawn area */}
          <rect
            x="120"
            y="60"
            width="420"
            height="260"
            rx="6"
            fill="#bbf7d0"
            stroke="#1971c2"
            strokeWidth="1.5"
            strokeDasharray="6,4"
            fillOpacity="0.5"
          />

          {/* Raised bed */}
          <rect
            x="160"
            y="100"
            width="120"
            height="70"
            rx="4"
            fill="#a16207"
            fillOpacity="0.25"
            stroke="#a16207"
            strokeWidth="1.5"
          />

          {/* Path strip */}
          <rect
            x="300"
            y="100"
            width="200"
            height="18"
            rx="3"
            fill="#d1d5db"
            fillOpacity="0.7"
          />

          {/* Trees — big canopy circles */}
          <circle cx="460" cy="240" r="40" fill="#4ade80" fillOpacity="0.3" />
          <circle cx="460" cy="240" r="6" fill="#713f12" />

          <circle cx="380" cy="290" r="28" fill="#4ade80" fillOpacity="0.3" />
          <circle cx="380" cy="290" r="5" fill="#713f12" />

          {/* Small plant icons (herbs) */}
          {[
            [175, 120],
            [205, 120],
            [235, 120],
            [175, 148],
            [205, 148],
            [235, 148],
          ].map(([cx, cy], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r="10"
              fill="#16a34a"
              fillOpacity="0.7"
            />
          ))}

          {/* Fence structure */}
          <line
            x1="120"
            y1="60"
            x2="540"
            y2="60"
            stroke="#78716c"
            strokeWidth="3"
          />

          {/* Dimension line */}
          <line
            x1="120"
            y1="340"
            x2="540"
            y2="340"
            stroke="#555"
            strokeWidth="1"
            markerEnd="url(#arrow)"
          />
          <text x="308" y="356" textAnchor="middle" fontSize="11" fill="#555">
            10 m
          </text>

          {/* Snap guide */}
          <line
            x1="160"
            y1="60"
            x2="160"
            y2="320"
            stroke="#1971c2"
            strokeWidth="0.75"
            strokeDasharray="4,3"
            opacity="0.5"
          />
        </svg>

        {/* Inspector panel mockup */}
        <div className="absolute top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-sm p-3 w-36 text-left">
          <p className="text-xs font-semibold text-gray-700 mb-2">Plant</p>
          <p className="text-xs text-gray-500">Tomato</p>
          <p className="text-xs text-gray-400 mt-1">Spacing: 60 cm</p>
          <p className="text-xs text-gray-400">Status: Planned</p>
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-right">Cost: $3.50</p>
          </div>
        </div>
      </div>
    </div>
  )
}
