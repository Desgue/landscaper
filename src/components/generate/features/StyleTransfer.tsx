import { useState, useRef, useCallback, useEffect } from 'react';
import { ImageIcon } from 'lucide-react';
import { useGenerateStore } from '../../../store/useGenerateStore';
import { RENDER_STYLES } from '../../../types/generate';

export function StyleTransfer() {
  const resultUrl = useGenerateStore((s) => s.resultUrl);
  const activeStyleResult = useGenerateStore((s) => s.activeStyleResult);
  const applyStyle = useGenerateStore((s) => s.applyStyle);
  const acceptStyle = useGenerateStore((s) => s.acceptStyle);
  const status = useGenerateStore((s) => s.status);

  const [selectedStyle, setSelectedStyle] = useState<string>(RENDER_STYLES[0].value);

  if (!resultUrl) {
    return (
      <div className="p-5 text-center py-12 space-y-3">
        <div className="w-12 h-12 rounded-full bg-bg-alt flex items-center justify-center mx-auto">
          <ImageIcon size={20} className="text-text-muted" />
        </div>
        <p className="text-sm text-text-muted">Generate an image first to apply styles</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        Style Transfer
      </div>

      {/* Before/After comparison */}
      {activeStyleResult ? (
        <BeforeAfterSlider
          beforeUrl={resultUrl}
          afterUrl={activeStyleResult}
        />
      ) : (
        <div className="aspect-video rounded-xl overflow-hidden bg-bg-elevated border border-border flex items-center justify-center">
          <p className="text-xs text-text-muted">Select a style and click Apply</p>
        </div>
      )}

      {/* Style pills */}
      <div>
        <div className="text-xs text-text-muted mb-2">Style</div>
        <div className="flex flex-wrap gap-2">
          {RENDER_STYLES.map((style) => (
            <button
              key={style.value}
              onClick={() => setSelectedStyle(style.value)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                selectedStyle === style.value
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-bg-elevated text-text-secondary hover:bg-bg-card hover:text-text border border-border'
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={applyStyle}
          disabled={status.kind === 'loading'}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-hover text-text transition-colors disabled:opacity-50"
        >
          {status.kind === 'loading' ? 'Applying...' : 'Apply Style'}
        </button>
        {activeStyleResult && (
          <button
            onClick={acceptStyle}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-primary hover:bg-primary-dark text-white transition-colors"
          >
            Accept This Style
          </button>
        )}
      </div>
    </div>
  );
}

// Before/After comparison slider (reuses pattern from Hero.tsx)
function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
}: {
  beforeUrl: string;
  afterUrl: string;
}) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  const handleMouseDown = () => {
    dragging.current = true;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging.current) handleMove(e.clientX);
    };
    const handleMouseUp = () => {
      dragging.current = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMove]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-video rounded-xl overflow-hidden border border-border cursor-col-resize select-none"
      onMouseDown={handleMouseDown}
    >
      {/* After (full) */}
      <img src={afterUrl} alt="After" className="absolute inset-0 w-full h-full object-cover" />

      {/* Before (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img
          src={beforeUrl}
          alt="Before"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ width: containerRef.current?.offsetWidth ?? '100%' }}
        />
      </div>

      {/* Divider */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A1D1A" strokeWidth="2">
            <path d="m9 18-6-6 6-6" /><path d="m15 6 6 6-6 6" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/50 text-white text-[10px] font-medium">
        Original
      </div>
      <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/50 text-white text-[10px] font-medium">
        Styled
      </div>
    </div>
  );
}
