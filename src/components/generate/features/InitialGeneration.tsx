import React, { useRef } from 'react';
import { SlidersHorizontal, Sparkles, Upload, X } from 'lucide-react';
import { useGenerateStore } from '../../../store/useGenerateStore';
import { useProjectStore } from '../../../store/useProjectStore';
import {
  GARDEN_STYLES,
  SEASONS,
  TIMES_OF_DAY,
  VIEWPOINTS,
  ASPECT_RATIOS,
} from '../../../types/generate';

export function InitialGeneration() {
  const options = useGenerateStore((s) => s.options);
  const setOption = useGenerateStore((s) => s.setOption);
  const yardPhoto = useGenerateStore((s) => s.yardPhoto);
  const yardPhotoName = useGenerateStore((s) => s.yardPhotoName);
  const setYardPhoto = useGenerateStore((s) => s.setYardPhoto);
  const generate = useGenerateStore((s) => s.generate);
  const cancel = useGenerateStore((s) => s.cancel);
  const status = useGenerateStore((s) => s.status);
  const fileRef = useRef<HTMLInputElement>(null);
  const hasYardBoundary = useProjectStore((s) => !!s.currentProject?.yardBoundary);

  const isLoading = status.kind === 'loading';

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('Please upload a JPEG or PNG image.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert('Photo too large. Maximum size is 3 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setYardPhoto(reader.result as string, file.name);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-6 space-y-5">
      {/* Photo upload */}
      <section>
        <div className="text-xs font-medium tracking-wider text-text-secondary mb-3">
          REFERENCE PHOTO (OPTIONAL)
        </div>
        {yardPhoto ? (
          <div className="relative rounded-lg border border-border overflow-hidden h-24 bg-bg-elevated">
            <img
              src={yardPhoto}
              alt="Yard reference"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            <div className="absolute bottom-2 left-2 text-xs text-white font-medium truncate max-w-[200px]">
              {yardPhotoName}
            </div>
            <button
              onClick={() => setYardPhoto(null, null)}
              className="absolute top-2 right-2 bg-bg-card/80 backdrop-blur-sm rounded-full p-1 text-text-muted hover:text-error transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-1.5 h-24 rounded-lg border-2 border-dashed border-border bg-bg-elevated/50 hover:border-primary-light hover:bg-bg-alt cursor-pointer transition-colors">
            <Upload size={20} className="text-text-muted" />
            <span className="text-xs text-text-muted">
              Drop yard photo or click to upload
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </label>
        )}
      </section>

      {/* Generation Options card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <SlidersHorizontal size={22} className="text-text-secondary" />
          <h2 className="text-xl font-semibold text-text">Generation Options</h2>
        </div>
        <hr className="border-gray-200 mt-4 mb-6" />

        <div className="space-y-6">
          <PillGroup
            label="STYLE"
            options={GARDEN_STYLES}
            value={options.gardenStyle}
            onChange={(v) => setOption('gardenStyle', v as typeof options.gardenStyle)}
          />

          <PillGroup
            label="SEASON"
            options={SEASONS}
            value={options.season}
            onChange={(v) => setOption('season', v as typeof options.season)}
          />

          <PillGroup
            label="TIME OF DAY"
            options={TIMES_OF_DAY}
            value={options.timeOfDay}
            onChange={(v) => setOption('timeOfDay', v as typeof options.timeOfDay)}
          />

          <PillGroup
            label="VIEW"
            options={VIEWPOINTS}
            value={options.viewpoint}
            onChange={(v) => setOption('viewpoint', v as typeof options.viewpoint)}
          />

          <PillGroup
            label="ASPECT RATIO"
            options={ASPECT_RATIOS}
            value={options.aspectRatio}
            onChange={(v) => setOption('aspectRatio', v as typeof options.aspectRatio)}
          />
        </div>
      </div>

      {/* Yard boundary warning */}
      {!hasYardBoundary && !isLoading && (
        <p className="text-xs text-text-muted text-center">
          Set up a yard boundary on the canvas first.
        </p>
      )}

      {/* Generate button */}
      <button
        onClick={isLoading ? cancel : generate}
        disabled={!isLoading && !hasYardBoundary}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-colors ${
          isLoading
            ? 'bg-bg-elevated text-text-secondary hover:bg-error/10 hover:text-error'
            : !hasYardBoundary
              ? 'bg-accent/50 text-text/50 cursor-not-allowed'
              : 'bg-accent hover:bg-accent-hover text-text shadow-sm'
        }`}
      >
        {isLoading ? (
          <>Cancel</>
        ) : (
          <>
            <Sparkles size={16} />
            Generate Preview
          </>
        )}
      </button>
    </div>
  );
}

// ── Pill group sub-component ────────────────────────────────────────────────

function PillGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="text-xs font-medium tracking-wider text-text-secondary mb-3">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              value === opt.value
                ? 'bg-primary text-white'
                : 'bg-white text-text border border-gray-300 hover:border-primary-light'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
