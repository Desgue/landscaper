const steps = [
  {
    number: '01',
    title: 'Define your space',
    description:
      'Trace your site boundary by setting edge dimensions. Curves supported. Your boundary is just another editable element — adjust it any time.',
  },
  {
    number: '02',
    title: 'Place and arrange',
    description:
      'Paint terrain, stamp plants, draw structures and paths. Everything snaps to a real-world grid. Undo is always available and nothing is destructive.',
  },
  {
    number: '03',
    title: 'Export your plan',
    description:
      'Download a to-scale PNG of your finished layout, or export the full project as JSON to share or back up. Visualise it as a photorealistic render in one click.',
  },
]

export default function HowItWorks() {
  return (
    <section className="bg-white py-24 px-6 border-t border-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-3">
            How it works
          </h2>
          <p className="text-gray-500 text-base max-w-lg mx-auto">
            Three steps from blank canvas to finished landscape plan.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden sm:block absolute top-5 left-[calc(100%_-_16px)] w-8 border-t-2 border-dashed border-gray-200 z-10" />
              )}

              <div className="flex flex-col gap-4">
                <div className="w-10 h-10 rounded-full bg-[#e8f0fb] text-[#1971c2] font-bold text-sm flex items-center justify-center shrink-0">
                  {step.number}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA row */}
        <div className="mt-16 text-center">
          <a
            href="#"
            className="inline-block bg-[#1971c2] hover:bg-[#1562a8] text-white font-semibold px-8 py-3.5 rounded-lg text-base transition-colors shadow-sm"
          >
            Start planning &rarr;
          </a>
          <p className="text-sm text-gray-400 mt-3">
            Runs entirely in your browser. Your data never leaves your device.
          </p>
        </div>
      </div>
    </section>
  )
}
