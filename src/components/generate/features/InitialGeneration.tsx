import { useRef } from 'react';
import { Sparkles, Upload, X, ChevronDown } from 'lucide-react';
import { useGenerateStore } from '../../../store/useGenerateStore';
import {
  GARDEN_STYLES,
  SEASONS,
  TIMES_OF_DAY,
  CAMERA_ANGLES,
  WEATHER_OPTIONS,
  RENDER_STYLES,
  RESOLUTIONS,
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

  const isLoading = status.kind === 'loading';

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      alert('Please upload a JPEG or PNG image.');
      return;
    }
    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo too large. Maximum size is 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setYardPhoto(reader.result as string, file.name);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-5 space-y-5">
      {/* Photo upload */}
      <section>
        <SectionLabel>Reference Photo (optional)</SectionLabel>
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

      {/* Options grid — 3 columns */}
      <section>
        <SectionLabel>Generation Options</SectionLabel>
        <div className="grid grid-cols-3 gap-3">
          <SelectField
            label="Garden Style"
            value={options.gardenStyle}
            options={GARDEN_STYLES}
            onChange={(v) => setOption('gardenStyle', v as typeof options.gardenStyle)}
          />
          <SelectField
            label="Season"
            value={options.season}
            options={SEASONS}
            onChange={(v) => setOption('season', v as typeof options.season)}
          />
          <SelectField
            label="Time of Day"
            value={options.timeOfDay}
            options={TIMES_OF_DAY}
            onChange={(v) => setOption('timeOfDay', v as typeof options.timeOfDay)}
          />
          <SelectField
            label="Camera Angle"
            value={options.cameraAngle}
            options={CAMERA_ANGLES}
            onChange={(v) => setOption('cameraAngle', v as typeof options.cameraAngle)}
          />
          <SelectField
            label="Weather"
            value={options.weather}
            options={WEATHER_OPTIONS}
            onChange={(v) => setOption('weather', v as typeof options.weather)}
          />
          <SelectField
            label="Render Style"
            value={options.renderStyle}
            options={RENDER_STYLES}
            onChange={(v) => setOption('renderStyle', v as typeof options.renderStyle)}
          />
        </div>
      </section>

      {/* Segment buttons */}
      <section>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <SectionLabel>Resolution</SectionLabel>
            <SegmentGroup
              options={RESOLUTIONS}
              value={options.resolution}
              onChange={(v) => setOption('resolution', v as typeof options.resolution)}
            />
          </div>
          <div>
            <SectionLabel>Aspect Ratio</SectionLabel>
            <SegmentGroup
              options={ASPECT_RATIOS}
              value={options.aspectRatio}
              onChange={(v) => setOption('aspectRatio', v as typeof options.aspectRatio)}
            />
          </div>
        </div>
      </section>

      {/* Toggles */}
      <section className="flex items-center gap-6">
        <ToggleField
          label="Include planned elements"
          checked={options.includePlanned}
          onChange={(v) => setOption('includePlanned', v)}
        />
        <ToggleField
          label="Thinking mode"
          checked={options.thinkingMode}
          onChange={(v) => setOption('thinkingMode', v)}
        />
      </section>

      {/* Advanced (collapsible) */}
      <AdvancedSection
        seed={options.seed}
        onSeedChange={(v) => setOption('seed', v)}
      />

      {/* Generate button */}
      <button
        onClick={isLoading ? cancel : generate}
        disabled={false}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-colors ${
          isLoading
            ? 'bg-bg-elevated text-text-secondary hover:bg-error/10 hover:text-error'
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

// ── Shared sub-components ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2">
      {children}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-text-muted mb-1">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-bg-card border border-border rounded-md px-3 py-1.5 pr-8 text-sm text-text cursor-pointer hover:border-primary-light focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        />
      </div>
    </div>
  );
}

function SegmentGroup({
  options,
  value,
  onChange,
}: {
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex rounded-lg bg-bg-elevated p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
            value === opt.value
              ? 'bg-primary text-white shadow-sm'
              : 'text-text-secondary hover:text-text'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-bg-elevated border border-border'
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </div>
      <span className="text-xs text-text-secondary">{label}</span>
    </label>
  );
}

function AdvancedSection({
  seed,
  onSeedChange,
}: {
  seed: number | null;
  onSeedChange: (value: number | null) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="border-t border-border pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text transition-colors"
      >
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}
        />
        Advanced
      </button>
      {open && (
        <div className="mt-3 pl-5">
          <label className="block text-xs text-text-muted mb-1">
            Seed (empty = random)
          </label>
          <input
            type="number"
            value={seed ?? ''}
            onChange={(e) =>
              onSeedChange(e.target.value === '' ? null : parseInt(e.target.value, 10))
            }
            placeholder="Random"
            className="w-40 bg-bg-card border border-border rounded-md px-3 py-1.5 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
        </div>
      )}
    </div>
  );
}

import React from 'react';
