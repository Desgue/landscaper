import { useState, useEffect } from 'react';
import { ImageIcon, Loader2, Download, RotateCcw } from 'lucide-react';
import type { FeatureId } from '../../types/generate';
import { useGenerateStore } from '../../store/useGenerateStore';
import { useProjectStore } from '../../store/useProjectStore';

export function Workspace() {
  const resultUrl = useGenerateStore((s) => s.resultUrl);
  const status = useGenerateStore((s) => s.status);
  const activeFeature = useGenerateStore((s) => s.activeFeature);

  // Loading state
  if (status.kind === 'loading') {
    return <LoadingState startedAt={status.startedAt} />;
  }

  // Error state is handled by ErrorToast — no inline display

  // Result state
  if (resultUrl) {
    return <ResultView />;
  }

  // Empty state
  return <EmptyState activeFeature={activeFeature} />;
}

function EmptyState({ activeFeature }: { activeFeature: FeatureId }) {
  const messages: Partial<Record<FeatureId, { title: string; sub: string }>> = {
    'initial': { title: 'No preview yet', sub: 'Configure your options below and generate' },
    'multi-view': { title: 'Generate views', sub: 'Create multiple perspectives of your design' },
    'seasonal': { title: 'No base image', sub: 'Generate an initial image first to create variants' },
    'draft-final': { title: 'No drafts yet', sub: 'Generate draft variants to compare' },
    'outpainting': { title: 'No image to expand', sub: 'Generate an image first' },
    'style-transfer': { title: 'No image to style', sub: 'Generate an image first' },
    'export': { title: 'Nothing to export', sub: 'Generate an image first' },
  };

  const msg = messages[activeFeature] ?? {
    title: 'No image yet',
    sub: 'Generate an image to get started',
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-bg-alt flex items-center justify-center mx-auto">
          <ImageIcon size={28} className="text-text-muted" />
        </div>
        <h3 className="text-base font-medium text-text">{msg.title}</h3>
        <p className="text-sm text-text-muted max-w-xs">{msg.sub}</p>
      </div>
    </div>
  );
}

function LoadingState({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        {/* Shimmer placeholder */}
        <div className="w-64 h-48 rounded-xl bg-bg-elevated animate-pulse mx-auto" />
        <div className="flex items-center justify-center gap-2 text-primary">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm font-medium">Generating your preview...</span>
        </div>
        <p className="text-xs text-text-muted">{elapsed}s elapsed</p>
      </div>
    </div>
  );
}

function ResultView() {
  const resultUrl = useGenerateStore((s) => s.resultUrl);
  const resultMimeType = useGenerateStore((s) => s.resultMimeType);
  const clearResult = useGenerateStore((s) => s.clearResult);
  const setActiveFeature = useGenerateStore((s) => s.setActiveFeature);
  const projectName = useProjectStore((s) => s.currentProject?.name ?? 'garden');

  const handleDownload = () => {
    if (!resultUrl) return;
    const ext = resultMimeType === 'image/jpeg' ? 'jpg' : 'png';
    const filename = `${projectName}-preview.${ext}`;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleGenerateAgain = () => {
    clearResult();
    setActiveFeature('initial');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
      <div className="relative max-w-full max-h-full">
        <img
          src={resultUrl!}
          alt="Generated landscape preview"
          className="max-w-full max-h-[55vh] rounded-xl shadow-lg border border-border object-contain"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleGenerateAgain}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-bg-elevated text-text-secondary hover:bg-bg-card hover:text-text border border-border transition-colors"
        >
          <RotateCcw size={14} />
          Generate Again
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-dark transition-colors"
        >
          <Download size={14} />
          Download
        </button>
      </div>
    </div>
  );
}
