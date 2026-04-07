import { useState, useRef } from 'react';
import { Upload, Check } from 'lucide-react';
import { useGenerateStore } from '../../../store/useGenerateStore';
import { PRESET_MATERIALS } from '../../../types/generate';
import type { MaterialSwatch } from '../../../types/generate';

const MOCK_ZONES = [
  { id: 'patio', name: 'Patio surface' },
  { id: 'path', name: 'Path' },
  { id: 'deck', name: 'Deck' },
  { id: 'fence', name: 'Fence' },
];

export function MaterialSwap() {
  const resultUrl = useGenerateStore((s) => s.resultUrl);
  const selectedMaterialId = useGenerateStore((s) => s.selectedMaterialId);
  const selectedZoneId = useGenerateStore((s) => s.selectedZoneId);
  const selectMaterial = useGenerateStore((s) => s.selectMaterial);
  const selectZone = useGenerateStore((s) => s.selectZone);
  const applyMaterial = useGenerateStore((s) => s.applyMaterial);
  const status = useGenerateStore((s) => s.status);

  const [customMaterials, setCustomMaterials] = useState<MaterialSwatch[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const allMaterials = [...PRESET_MATERIALS, ...customMaterials];

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCustomMaterials((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: file.name.replace(/\.[^.]+$/, ''),
          imageUrl: reader.result as string,
          custom: true,
        },
      ]);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex h-full">
      {/* Left: Image workspace */}
      <div className="flex-1 flex items-center justify-center p-6 bg-bg">
        {resultUrl ? (
          <img
            src={resultUrl}
            alt="Current view"
            className="max-w-full max-h-full rounded-xl shadow-lg border border-border object-contain"
          />
        ) : (
          <div className="text-center space-y-3">
            <p className="text-sm text-text-muted">
              Generate an image first to swap materials
            </p>
          </div>
        )}
      </div>

      {/* Right: Material panel (280px) */}
      <div className="w-[280px] border-l border-border bg-bg-card flex flex-col overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Target zone */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2">
              Target Zone
            </div>
            <select
              value={selectedZoneId ?? ''}
              onChange={(e) => selectZone(e.target.value || null)}
              className="w-full bg-bg-card border border-border rounded-md px-3 py-1.5 text-sm text-text"
            >
              <option value="">Select a zone...</option>
              {MOCK_ZONES.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          {/* Preset materials */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2">
              Materials
            </div>
            <div className="grid grid-cols-3 gap-2">
              {allMaterials.map((mat) => (
                <button
                  key={mat.id}
                  onClick={() => selectMaterial(mat.id)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedMaterialId === mat.id
                      ? 'border-primary shadow-sm'
                      : 'border-border hover:border-primary-light'
                  }`}
                >
                  <div
                    className="aspect-square"
                    style={{
                      backgroundColor: mat.color,
                      backgroundImage: mat.imageUrl
                        ? `url(${mat.imageUrl})`
                        : undefined,
                      backgroundSize: 'cover',
                    }}
                  />
                  <div className="px-1.5 py-1 bg-bg-card text-[10px] text-text-secondary text-center truncate">
                    {mat.name}
                  </div>
                  {selectedMaterialId === mat.id && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom upload */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2">
              Custom
            </div>
            <label className="flex items-center justify-center gap-2 py-2 rounded-lg border-2 border-dashed border-border hover:border-primary-light cursor-pointer transition-colors">
              <Upload size={14} className="text-text-muted" />
              <span className="text-xs text-text-muted">Upload swatch</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCustomUpload}
              />
            </label>
          </div>

          {/* Apply */}
          <button
            onClick={applyMaterial}
            disabled={!selectedMaterialId || !selectedZoneId || status.kind === 'loading'}
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-hover text-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Material
          </button>
        </div>
      </div>
    </div>
  );
}
