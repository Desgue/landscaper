import { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ImageIcon, Check, X } from 'lucide-react';
import { useGenerateStore } from '../../../store/useGenerateStore';

const DIRECTIONS = [
  { id: 'street', label: 'Toward Street', icon: ArrowUp, position: 'top' },
  { id: 'house', label: 'Toward House', icon: ArrowDown, position: 'bottom' },
  { id: 'left', label: 'Left', icon: ArrowLeft, position: 'left' },
  { id: 'right', label: 'Right', icon: ArrowRight, position: 'right' },
] as const;

export function Outpainting() {
  const resultUrl = useGenerateStore((s) => s.resultUrl);
  const [selectedDirection, setSelectedDirection] = useState<string>('street');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePreview = () => {
    setLoading(true);
    setTimeout(() => {
      setPreviewUrl('/mock-result.png');
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="p-5 space-y-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        Expand View (Outpainting)
      </div>

      {!resultUrl ? (
        <div className="text-center py-8 space-y-3">
          <div className="w-12 h-12 rounded-full bg-bg-alt flex items-center justify-center mx-auto">
            <ImageIcon size={20} className="text-text-muted" />
          </div>
          <p className="text-sm text-text-muted">
            Generate an image first to expand it
          </p>
        </div>
      ) : (
        <>
          {/* Direction selector as visual buttons around a center square */}
          <div className="flex flex-col items-center gap-2 py-4">
            {/* Top */}
            <DirectionButton
              direction={DIRECTIONS[0]}
              selected={selectedDirection === 'street'}
              onClick={() => setSelectedDirection('street')}
            />

            <div className="flex items-center gap-2">
              {/* Left */}
              <DirectionButton
                direction={DIRECTIONS[2]}
                selected={selectedDirection === 'left'}
                onClick={() => setSelectedDirection('left')}
              />

              {/* Center image placeholder */}
              <div className="w-32 h-24 rounded-lg border-2 border-border bg-bg-elevated flex items-center justify-center">
                <ImageIcon size={20} className="text-text-muted" />
              </div>

              {/* Right */}
              <DirectionButton
                direction={DIRECTIONS[3]}
                selected={selectedDirection === 'right'}
                onClick={() => setSelectedDirection('right')}
              />
            </div>

            {/* Bottom */}
            <DirectionButton
              direction={DIRECTIONS[1]}
              selected={selectedDirection === 'house'}
              onClick={() => setSelectedDirection('house')}
            />
          </div>

          {/* Selected direction */}
          <div className="text-xs text-text-muted text-center">
            Expand: <span className="font-medium text-text">
              {DIRECTIONS.find((d) => d.id === selectedDirection)?.label}
            </span>
          </div>

          {/* Preview / Accept / Reject */}
          {previewUrl ? (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPreviewUrl(null)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md bg-error/10 text-error hover:bg-error/20 transition-colors"
              >
                <X size={14} /> Reject
              </button>
              <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md bg-success/10 text-success hover:bg-success/20 transition-colors">
                <Check size={14} /> Accept Expanded
              </button>
            </div>
          ) : (
            <button
              onClick={handlePreview}
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-hover text-text transition-colors disabled:opacity-50"
            >
              {loading ? 'Generating preview...' : 'Preview Expansion'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function DirectionButton({
  direction,
  selected,
  onClick,
}: {
  direction: (typeof DIRECTIONS)[number];
  selected: boolean;
  onClick: () => void;
}) {
  const Icon = direction.icon;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
        selected
          ? 'bg-primary text-white shadow-sm'
          : 'bg-bg-elevated text-text-secondary hover:bg-primary/10 hover:text-primary'
      }`}
    >
      <Icon size={14} />
      {direction.label}
    </button>
  );
}
