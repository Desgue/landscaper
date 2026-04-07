import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';

interface Variant {
  id: string;
  label: string;
  imageUrl: string | null;
  loading: boolean;
}

const SEASON_PILLS = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;
const TIME_PILLS = ['Morning', 'Midday', 'Golden Hour', 'Dusk'] as const;
const WEATHER_PILLS = ['Clear', 'Overcast', 'Rain'] as const;

export function SeasonalVariants() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [activeSeason, setActiveSeason] = useState<string>('Summer');
  const [activeTime, setActiveTime] = useState<string>('Golden Hour');
  const [activeWeather, setActiveWeather] = useState<string>('Clear');
  const [activeVariant, setActiveVariant] = useState<string | null>(null);

  const addVariant = () => {
    const id = crypto.randomUUID();
    const label = `${activeSeason} · ${activeTime}`;
    setVariants((prev) => [...prev, { id, label, imageUrl: null, loading: true }]);

    setTimeout(() => {
      setVariants((prev) =>
        prev.map((v) =>
          v.id === id ? { ...v, loading: false, imageUrl: '/mock-result.png' } : v,
        ),
      );
    }, 2000);
  };

  return (
    <div className="p-5 space-y-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        Seasonal & Lighting Variants
      </div>

      {/* Variant strip */}
      {variants.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {variants.map((v) => (
            <button
              key={v.id}
              onClick={() => setActiveVariant(v.id)}
              className={`flex-shrink-0 w-24 rounded-lg overflow-hidden border-2 transition-colors ${
                activeVariant === v.id ? 'border-primary' : 'border-border'
              }`}
            >
              <div className="aspect-square bg-bg-elevated flex items-center justify-center">
                {v.loading ? (
                  <Loader2 size={16} className="animate-spin text-primary" />
                ) : v.imageUrl ? (
                  <img src={v.imageUrl} alt={v.label} className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div className="p-1.5 bg-bg-card text-[10px] text-text-secondary text-center truncate">
                {v.label}
              </div>
            </button>
          ))}

          {/* Add button */}
          <button
            onClick={addVariant}
            className="flex-shrink-0 w-24 rounded-lg border-2 border-dashed border-border hover:border-primary-light flex flex-col items-center justify-center gap-1 transition-colors"
          >
            <Plus size={18} className="text-text-muted" />
            <span className="text-[10px] text-text-muted">Add</span>
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-3">
        <PillRow
          label="Season"
          options={SEASON_PILLS}
          value={activeSeason}
          onChange={setActiveSeason}
        />
        <PillRow
          label="Time"
          options={TIME_PILLS}
          value={activeTime}
          onChange={setActiveTime}
        />
        <PillRow
          label="Weather"
          options={WEATHER_PILLS}
          value={activeWeather}
          onChange={setActiveWeather}
        />
      </div>

      <button
        onClick={addVariant}
        className="w-full py-2.5 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-hover text-text transition-colors"
      >
        Apply to Current View
      </button>
    </div>
  );
}

function PillRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-xs text-text-muted mb-1.5">{label}</div>
      <div className="flex rounded-lg bg-bg-elevated p-0.5">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              value === opt
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
