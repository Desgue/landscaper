export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg border border-green-200 bg-green-50 flex items-center justify-center">
            <LeafIcon />
          </div>
          <span className="text-lg font-semibold tracking-tight text-gray-900">
            Greenprint
          </span>
        </div>
        <a
          href="#"
          className="bg-[#1971c2] hover:bg-[#1562a8] text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          Try it free
        </a>
      </div>
    </header>
  )
}

function LeafIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1971c2"
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
