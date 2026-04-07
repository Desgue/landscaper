import { useState, useEffect } from 'react';
import { ImageIcon, Loader2, X } from 'lucide-react';
import type { GenerateStatus, FeatureId } from '../../types/generate';

interface WorkspaceProps {
  resultUrl: string | null;
  status: GenerateStatus;
  activeFeature: FeatureId;
}

export function Workspace({ resultUrl, status, activeFeature }: WorkspaceProps) {
  // Loading state
  if (status.kind === 'loading') {
    return <LoadingState startedAt={status.startedAt} />;
  }

  // Error state
  if (status.kind === 'error') {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mx-auto">
            <X size={24} className="text-error" />
          </div>
          <p className="text-sm text-text-secondary">{status.message}</p>
        </div>
      </div>
    );
  }

  // Result state
  if (resultUrl) {
    return <ResultView imageUrl={resultUrl} />;
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

function ResultView({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="relative max-w-full max-h-full">
        <img
          src={imageUrl}
          alt="Generated landscape preview"
          className="max-w-full max-h-[60vh] rounded-xl shadow-lg border border-border object-contain"
        />
      </div>
    </div>
  );
}
