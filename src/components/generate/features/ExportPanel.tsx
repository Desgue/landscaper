import { useState } from 'react';
import { Download, Link, ImageIcon, Check } from 'lucide-react';
import { useGenerateStore } from '../../../store/useGenerateStore';

const EXPORT_RESOLUTIONS = [
  { value: '1k', label: '1K', desc: '1024px' },
  { value: '2k', label: '2K', desc: '2048px' },
  { value: '4k', label: '4K', desc: '4096px' },
] as const;

const EXPORT_ASPECTS = [
  { value: '16:9', label: '16:9' },
  { value: '1:1', label: '1:1' },
  { value: '9:16', label: '9:16' },
] as const;

export function ExportPanel() {
  const resultUrl = useGenerateStore((s) => s.resultUrl);
  const [resolution, setResolution] = useState('2k');
  const [aspect, setAspect] = useState('16:9');
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `greenprint-preview-${resolution}.png`;
    a.click();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!resultUrl) {
    return (
      <div className="p-5 text-center py-12 space-y-3">
        <div className="w-12 h-12 rounded-full bg-bg-alt flex items-center justify-center mx-auto">
          <ImageIcon size={20} className="text-text-muted" />
        </div>
        <p className="text-sm text-text-muted">Nothing to export yet</p>
        <p className="text-xs text-text-muted">Generate an image first</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        Export
      </div>

      {/* Resolution */}
      <div>
        <div className="text-xs text-text-muted mb-2">Resolution</div>
        <div className="flex rounded-lg bg-bg-elevated p-0.5">
          {EXPORT_RESOLUTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setResolution(opt.value)}
              className={`flex-1 py-2 text-center rounded-md transition-colors ${
                resolution === opt.value
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              <div className="text-xs font-medium">{opt.label}</div>
              <div className="text-[10px] opacity-70">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Aspect ratio */}
      <div>
        <div className="text-xs text-text-muted mb-2">Aspect Ratio</div>
        <div className="flex rounded-lg bg-bg-elevated p-0.5">
          {EXPORT_ASPECTS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setAspect(opt.value)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                aspect === opt.value
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Download button */}
      <button
        onClick={handleDownload}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-hover text-text shadow-sm transition-colors"
      >
        <Download size={16} />
        Download Image
      </button>

      {/* Share link */}
      <button
        onClick={handleCopyLink}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border border-border text-text-secondary hover:bg-bg-elevated transition-colors"
      >
        {copied ? (
          <>
            <Check size={14} className="text-success" />
            Copied!
          </>
        ) : (
          <>
            <Link size={14} />
            Copy Share Link
          </>
        )}
      </button>
    </div>
  );
}
