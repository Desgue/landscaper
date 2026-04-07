import { Eye, Mountain, Bird, Loader2, ImageIcon } from 'lucide-react';
import { useState } from 'react';

interface ViewSlot {
  id: string;
  label: string;
  icon: React.ReactNode;
  imageUrl: string | null;
  loading: boolean;
}

export function MultiView() {
  const [views, setViews] = useState<ViewSlot[]>([
    { id: 'eye-level', label: 'Eye Level', icon: <Eye size={20} />, imageUrl: null, loading: false },
    { id: '3-4-elevated', label: '3/4 Elevated', icon: <Mountain size={20} />, imageUrl: null, loading: false },
    { id: 'birds-eye', label: "Bird's Eye", icon: <Bird size={20} />, imageUrl: null, loading: false },
  ]);
  const [baseView, setBaseView] = useState('eye-level');

  const generateView = (viewId: string) => {
    setViews((prev) =>
      prev.map((v) => (v.id === viewId ? { ...v, loading: true } : v)),
    );
    // Stub: resolve after 2s
    setTimeout(() => {
      setViews((prev) =>
        prev.map((v) =>
          v.id === viewId ? { ...v, loading: false, imageUrl: '/mock-result.png' } : v,
        ),
      );
    }, 2000);
  };

  const generateAll = () => {
    views.forEach((v, i) => {
      setTimeout(() => generateView(v.id), i * 500);
    });
  };

  return (
    <div className="p-5 space-y-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        Multi-View Generation
      </div>

      {/* Three view slots */}
      <div className="grid grid-cols-3 gap-4">
        {views.map((view) => (
          <div
            key={view.id}
            className={`rounded-xl border-2 overflow-hidden transition-colors ${
              baseView === view.id
                ? 'border-primary shadow-md'
                : 'border-border'
            }`}
          >
            {/* Image area */}
            <div className="aspect-[4/3] bg-bg-elevated flex items-center justify-center relative">
              {view.loading ? (
                <div className="flex flex-col items-center gap-2 text-primary">
                  <Loader2 size={24} className="animate-spin" />
                  <span className="text-xs">Generating...</span>
                </div>
              ) : view.imageUrl ? (
                <img
                  src={view.imageUrl}
                  alt={view.label}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-text-muted">
                  {view.icon}
                  <ImageIcon size={20} />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-bg-card border-t border-border">
              <div className="text-sm font-medium text-text mb-2">{view.label}</div>
              <button
                onClick={() => generateView(view.id)}
                disabled={view.loading}
                className="w-full py-1.5 text-xs font-medium rounded-md bg-bg-elevated text-text-secondary hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
              >
                {view.loading ? 'Generating...' : view.imageUrl ? 'Regenerate' : 'Generate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-muted">Use as base:</label>
          <select
            value={baseView}
            onChange={(e) => setBaseView(e.target.value)}
            className="bg-bg-card border border-border rounded-md px-2 py-1 text-xs text-text"
          >
            {views.map((v) => (
              <option key={v.id} value={v.id}>{v.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={generateAll}
          className="px-4 py-1.5 text-xs font-semibold rounded-md bg-accent hover:bg-accent-hover text-text transition-colors"
        >
          Generate All Views
        </button>
      </div>
    </div>
  );
}
