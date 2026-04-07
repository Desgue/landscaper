export default function Footer() {
  return (
    <footer className="border-t border-border bg-bg px-6 py-10">
      <div className="max-w-6xl mx-auto">
        {/* Top row: logo + nav links */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 mb-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <LeafIcon />
            <span className="font-semibold text-text">Greenprint</span>
          </div>
          {/* Links */}
          <div className="flex gap-6 text-sm">
            <a href="/app" className="text-text-secondary hover:text-text transition-colors">Open Canvas</a>
            <a href="#how-it-works" className="text-text-secondary hover:text-text transition-colors">How It Works</a>
            <a href="#pricing" className="text-text-secondary hover:text-text transition-colors">Pricing</a>
          </div>
        </div>
        {/* Bottom row: privacy + copyright */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-text-muted">
          <p>Your plans are stored locally in your browser — we never see them.</p>
          <p>&copy; {new Date().getFullYear()} Greenprint</p>
        </div>
      </div>
    </footer>
  )
}

function LeafIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-primary)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  )
}
