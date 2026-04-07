export default function Features() {
  return (
    <section className="bg-gray-50 py-24 px-6 border-t border-gray-100">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-3">
            What you can do with it
          </h2>
          <p className="text-gray-500 text-base max-w-xl mx-auto">
            You draw the plan. Greenprint turns it into a picture.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid md:grid-cols-3 gap-5">
          {/* Primary card — spans 2 cols */}
          <div className="md:col-span-2 bg-[#e8f0fb] rounded-xl border border-blue-100 p-7 flex gap-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="w-12 h-12 rounded-lg bg-[#1971c2] text-white flex items-center justify-center shrink-0">
              <ImageIcon />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1.5 text-lg">
                One-click realistic image
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed max-w-lg">
                Click generate and your layout becomes a realistic image.
                Greenprint reads your plan, figures out what goes where, and
                produces something that looks like a photo of a finished
                landscape. One button.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl border border-gray-200 p-7 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center mb-4">
              <CameraIcon />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1.5">
              Ground it in your real yard
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Upload a photo of your yard. Greenprint uses it as a reference, so
              the image matches your actual space — not a generic backyard from
              nowhere.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-xl border border-gray-200 p-7 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center mb-4">
              <SlidersIcon />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1.5">
              Your style. Your season.
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Contemporary, cottage, formal, tropical, Japanese — pick one. Set
              the season or let Greenprint detect it from your location. Choose
              time of day. Every image comes out different.
            </p>
          </div>

          {/* Card 4 — spans 2 cols on md */}
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-7 flex gap-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <CanvasIcon />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1.5">
                A canvas that means what you draw
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed max-w-lg">
                Draw boundaries, paint terrain, drop in plants and structures.
                The grid is to scale, everything snaps, and layers keep things
                organized. What you draw is exactly what gets rendered.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ImageIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function SlidersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
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
