const features = [
  {
    title: 'Canvas-based design tool',
    description:
      'Draw your site boundary, paint terrain types, and place plants, structures, and paths on a real-world grid. Every element snaps, layers, and composites to scale.',
    icon: <CanvasIcon />,
  },
  {
    title: 'Full plant & material library',
    description:
      'Choose from built-in plant types — herbs, trees, shrubs, climbers — with accurate spacing and growth form. Lay terrain, add structures, paths, and get automatic material cost estimates.',
    icon: <PlantIcon />,
  },
  {
    title: 'Project journal',
    description:
      'Log entries linked directly to canvas elements. Track site observations, planting dates, and progress notes. Entries include a weather snapshot fetched automatically at the time of writing.',
    icon: <JournalIcon />,
  },
  {
    title: 'AI visualisation',
    description:
      "Generate a photorealistic bird's-eye render of your plan. Greenprint builds a 3D scene from your layout and submits it to an image model — no prompting required.",
    icon: <ImageIcon />,

  },
]

export default function Features() {
  return (
    <section className="bg-gray-50 py-24 px-6 border-t border-gray-100">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-3">
            Everything you need to design your landscape
          </h2>
          <p className="text-gray-500 text-base max-w-xl mx-auto">
            From first sketch to seasonal tracking — in the browser, offline,
            with no account.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-xl border border-gray-200 p-7 flex gap-5"
            >
              <div className="shrink-0 w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                {f.icon}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1.5">
                  {f.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CanvasIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  )
}

function PlantIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22V12" />
      <path d="M5 12C5 7 9 3 12 3c3 0 7 4 7 9" />
      <path d="M12 12C10 10 7 9 5 12" />
      <path d="M12 12c2-2 5-3 7 0" />
    </svg>
  )
}

function JournalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 6c0-1.1.9-2 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" />
      <path d="M8 6v16" />
      <line x1="12" y1="10" x2="18" y2="10" />
      <line x1="12" y1="14" x2="18" y2="14" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  )
}
