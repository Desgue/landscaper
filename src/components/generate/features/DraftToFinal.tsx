import { Loader2, Check } from 'lucide-react';
import { useGenerateStore } from '../../../store/useGenerateStore';

const RESOLUTION_OPTIONS = [
  { value: '1k', label: '1K' },
  { value: '2k', label: '2K' },
  { value: '4k', label: '4K' },
] as const;

export function DraftToFinal() {
  const draftVariants = useGenerateStore((s) => s.draftVariants);
  const selectDraft = useGenerateStore((s) => s.selectDraft);
  const generateDrafts = useGenerateStore((s) => s.generateDrafts);
  const upscaleSelected = useGenerateStore((s) => s.upscaleSelected);
  const status = useGenerateStore((s) => s.status);

  const selected = draftVariants.find((d) => d.selected);
  const isLoading = status.kind === 'loading';

  return (
    <div className="p-5 space-y-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        Draft &rarr; Final Workflow
      </div>

      <p className="text-xs text-text-muted">
        Generate cheap drafts at 512px, pick the best, then upscale to full resolution.
      </p>

      {/* Draft grid */}
      {draftVariants.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {draftVariants.map((draft, i) => (
            <button
              key={draft.id}
              onClick={() => selectDraft(draft.id)}
              className={`rounded-xl overflow-hidden border-2 transition-colors ${
                draft.selected
                  ? 'border-primary shadow-md'
                  : 'border-border hover:border-primary-light'
              }`}
            >
              <div className="aspect-square bg-bg-elevated flex items-center justify-center relative">
                <img
                  src={draft.imageUrl}
                  alt={`Draft ${String.fromCharCode(65 + i)}`}
                  className="w-full h-full object-cover"
                />
                {draft.selected && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check size={14} className="text-white" />
                  </div>
                )}
              </div>
              <div className="px-2 py-1.5 bg-bg-card text-center">
                <span className="text-xs font-medium text-text">
                  Draft {String.fromCharCode(65 + i)}
                </span>
                <span className="text-[10px] text-text-muted block">512px</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-bg-alt flex items-center justify-center mx-auto mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <p className="text-sm text-text-muted">No drafts yet</p>
        </div>
      )}

      {/* Generate drafts button */}
      <button
        onClick={generateDrafts}
        disabled={isLoading}
        className="w-full py-2.5 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-hover text-text transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isLoading && <Loader2 size={14} className="animate-spin" />}
        {draftVariants.length > 0 ? 'Regenerate Drafts' : 'Generate 3 Drafts'}
      </button>

      {/* Upscale section */}
      {selected && (
        <div className="pt-3 border-t border-border space-y-3">
          <div className="text-xs text-text-muted">
            Upscale <span className="font-medium text-text">Draft {
              String.fromCharCode(65 + draftVariants.findIndex((d) => d.selected))
            }</span> to:
          </div>
          <div className="flex rounded-lg bg-bg-elevated p-0.5">
            {RESOLUTION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className="flex-1 py-1.5 text-xs font-medium rounded-md text-text-secondary hover:text-text transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={upscaleSelected}
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-primary hover:bg-primary-dark text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            Upscale Selected
          </button>
        </div>
      )}
    </div>
  );
}
