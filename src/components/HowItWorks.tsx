const steps = [
  {
    number: '01',
    title: 'Draw your layout',
    description:
      'Set your yard boundary, paint in grass or gravel, and place plants, structures, and walkways. You can also drop in a photo of your real yard so the AI has something to work from.',
  },
  {
    number: '02',
    title: 'Set the vibe',
    description:
      'Pick a style — contemporary, cottage, Japanese, whatever. Set the season and time of day. Eye-level gives you a walkthrough perspective; overhead shows the full layout.',
  },
  {
    number: '03',
    title: 'Hit generate',
    description:
      'One click. Greenprint converts your layout into an image that looks like a photo of the finished landscape. Usually takes a few seconds.',
  },
]

export default function HowItWorks() {
  return (
    <section
      className="relative bg-white py-24 px-6 border-t border-gray-100"
      style={{ background: 'radial-gradient(ellipse at center, rgba(25,113,194,0.03) 0%, transparent 70%), #ffffff' }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-3">
            How it works
          </h2>
          <p className="text-gray-500 text-base max-w-lg mx-auto">
            Blank canvas to finished landscape in under a minute.
          </p>
        </div>

        {/* Steps with timeline */}
        <div className="relative">
          {/* Connector line (desktop only) */}
          <div className="hidden sm:block absolute top-5 left-0 right-0 h-px bg-gray-200 z-0" />

          <div className="grid sm:grid-cols-3 gap-8 relative z-10">
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col items-center sm:items-center text-center">
                <div className="w-10 h-10 rounded-full bg-[#e8f0fb] text-[#1971c2] font-bold text-sm flex items-center justify-center shrink-0 ring-4 ring-white mb-5">
                  {step.number}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 w-full">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
