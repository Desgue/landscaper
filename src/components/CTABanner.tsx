export default function CTABanner() {
  return (
    <section className="relative overflow-hidden bg-[#1971c2] py-16 px-6">
      {/* Subtle topographic pattern */}
      <div className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 30% 50%, transparent 40%, rgba(255,255,255,0.3) 41%, transparent 42%),
            radial-gradient(ellipse at 70% 30%, transparent 35%, rgba(255,255,255,0.2) 36%, transparent 37%),
            radial-gradient(ellipse at 50% 80%, transparent 45%, rgba(255,255,255,0.25) 46%, transparent 47%)
          `,
          backgroundSize: '300px 200px, 250px 180px, 350px 220px',
        }}
      />

      <div className="relative max-w-3xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          Ready to see your yard before you build it?
        </h2>
        <p className="text-blue-100 mb-8 max-w-md mx-auto">
          Free, no account needed. Your plans are stored in your browser. We
          generate images on our server and don't keep them.
        </p>
        <a
          href="/app"
          className="inline-block bg-white text-[#1971c2] font-semibold px-8 py-3.5 rounded-lg text-base transition-colors shadow-sm hover:bg-gray-100"
        >
          Open the canvas &rarr;
        </a>
      </div>
    </section>
  )
}
