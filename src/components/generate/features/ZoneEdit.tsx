import { useState } from 'react';
import { Target } from 'lucide-react';
import { useGenerateStore } from '../../../store/useGenerateStore';

interface Zone {
  id: string;
  name: string;
  color: string;
}

const MOCK_ZONES: Zone[] = [
  { id: 'patio', name: 'Patio', color: '#D4B896' },
  { id: 'lawn', name: 'Lawn', color: '#40916C' },
  { id: 'garden-bed', name: 'Garden Bed (north)', color: '#8B6914' },
  { id: 'path', name: 'Path', color: '#B0B0B0' },
];

export function ZoneEdit() {
  const resultUrl = useGenerateStore((s) => s.resultUrl);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  const selected = MOCK_ZONES.find((z) => z.id === selectedZone);

  return (
    <div className="p-5 space-y-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        Zone-Based Editing
      </div>

      {!resultUrl ? (
        <div className="text-center py-8 space-y-3">
          <div className="w-12 h-12 rounded-full bg-bg-alt flex items-center justify-center mx-auto">
            <Target size={20} className="text-text-muted" />
          </div>
          <p className="text-sm text-text-muted">
            Generate an image first to edit specific zones
          </p>
        </div>
      ) : (
        <>
          {/* Zone selection list */}
          <div className="space-y-1">
            <div className="text-xs text-text-muted mb-1.5">
              Select a zone to edit:
            </div>
            {MOCK_ZONES.map((zone) => (
              <button
                key={zone.id}
                onClick={() => setSelectedZone(zone.id)}
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedZone === zone.id
                    ? 'bg-primary/10 border border-primary text-text font-medium'
                    : hoveredZone === zone.id
                      ? 'bg-bg-elevated text-text'
                      : 'text-text-secondary hover:bg-bg-elevated'
                }`}
              >
                <div
                  className="w-4 h-4 rounded border border-border"
                  style={{ backgroundColor: zone.color }}
                />
                <span>{zone.name}</span>
                {selectedZone === zone.id && (
                  <span className="ml-auto text-[10px] text-primary font-semibold">
                    SELECTED
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Edit prompt */}
          {selected && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="text-xs text-text-muted">
                Editing: <span className="font-medium text-text">{selected.name}</span>
              </div>
              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder={`Describe edit for ${selected.name}...`}
                rows={2}
                className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted resize-none focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
              <button
                disabled={!editPrompt.trim()}
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-hover text-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Edit This Zone Only
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
