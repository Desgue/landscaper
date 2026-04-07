import { useNavigate } from '@tanstack/react-router';

export function GenerateHeader() {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="h-14 px-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg border border-primary-light/30 bg-bg-alt flex items-center justify-center">
            <LeafIcon />
          </div>
          <span className="text-lg font-semibold tracking-tight text-text">
            Greenprint
          </span>
        </div>

        {/* Tab pills */}
        <div className="flex items-center bg-bg-elevated rounded-lg p-1">
          <button
            onClick={() => navigate({ to: '/app/canvas' })}
            className="px-4 py-1.5 text-sm font-medium rounded-md text-text-secondary hover:text-text transition-colors"
          >
            Canvas
          </button>
          <button
            className="px-4 py-1.5 text-sm font-medium rounded-md bg-primary text-white shadow-sm"
          >
            Generate
          </button>
        </div>

        {/* Project name placeholder */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">Project</span>
        </div>
      </div>
    </header>
  );
}

function LeafIcon() {
  return (
    <svg
      width="22"
      height="22"
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
  );
}
