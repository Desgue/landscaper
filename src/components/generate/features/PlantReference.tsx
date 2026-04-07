import { Check, AlertTriangle, Leaf } from 'lucide-react';
import { useState } from 'react';
import type { PlantEntry } from '../../../types/generate';

const MOCK_PLANTS: PlantEntry[] = [
  { id: '1', commonName: 'Lavender', botanicalName: 'Lavandula angustifolia', verified: true },
  { id: '2', commonName: 'Japanese Maple', botanicalName: 'Acer palmatum', verified: true },
  { id: '3', commonName: 'Rosemary', botanicalName: 'Salvia rosmarinus', verified: true },
  { id: '4', commonName: 'Unknown Shrub', botanicalName: null, verified: false },
  { id: '5', commonName: 'Cherry Tomato', botanicalName: 'Solanum lycopersicum var. cerasiforme', verified: false },
];

export function PlantReference() {
  const [plants] = useState<PlantEntry[]>(MOCK_PLANTS);
  const [verifyEnabled, setVerifyEnabled] = useState(true);

  const verifiedCount = plants.filter((p) => p.verified).length;

  return (
    <div className="p-5 space-y-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        Plant Species Reference
      </div>

      <p className="text-xs text-text-muted">
        Plants from your design are shown below. Verified species will render accurately.
      </p>

      {/* Stats */}
      <div className="flex items-center gap-4 py-2 px-3 rounded-lg bg-bg-alt">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-success" />
          <span className="text-xs text-text-secondary">
            {verifiedCount} verified
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-warning" />
          <span className="text-xs text-text-secondary">
            {plants.length - verifiedCount} unverified
          </span>
        </div>
      </div>

      {/* Plant list */}
      <div className="space-y-1">
        {plants.map((plant) => (
          <div
            key={plant.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-bg-elevated transition-colors"
          >
            {/* Icon */}
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                plant.verified ? 'bg-success/10' : 'bg-warning/10'
              }`}
            >
              <Leaf
                size={16}
                className={plant.verified ? 'text-success' : 'text-warning'}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text">{plant.commonName}</div>
              <div className="text-[11px] text-text-muted italic truncate">
                {plant.botanicalName ?? 'Species unknown'}
              </div>
            </div>

            {/* Status badge */}
            {plant.verified ? (
              <span className="flex items-center gap-1 text-[11px] font-medium text-success">
                <Check size={12} /> Verified
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-medium text-warning">
                <AlertTriangle size={12} /> Unverified
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Verify toggle */}
      <div className="pt-3 border-t border-border">
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setVerifyEnabled(!verifyEnabled)}
            className={`relative w-9 h-5 rounded-full transition-colors ${
              verifyEnabled ? 'bg-primary' : 'bg-bg-elevated border border-border'
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                verifyEnabled ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </div>
          <span className="text-xs text-text-secondary">
            Verify species accuracy on next generation
          </span>
        </label>
      </div>
    </div>
  );
}
