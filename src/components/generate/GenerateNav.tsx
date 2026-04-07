import {
  Sparkles,
  Layers,
  Pencil,
  SlidersHorizontal,
  Download,
} from 'lucide-react';
import type { FeatureId } from '../../types/generate';
import { FEATURE_NAV } from '../../types/generate';

const STAGE_ICONS: Record<string, React.ReactNode> = {
  Generate: <Sparkles size={16} />,
  Variants: <Layers size={16} />,
  Edit: <Pencil size={16} />,
  Refine: <SlidersHorizontal size={16} />,
  Export: <Download size={16} />,
};

interface GenerateNavProps {
  activeFeature: FeatureId;
  onSelect: (feature: FeatureId) => void;
  collapsed?: boolean;
}

export function GenerateNav({ activeFeature, onSelect, collapsed }: GenerateNavProps) {
  // Group features by stage
  const stages = new Map<string, typeof FEATURE_NAV>();
  for (const item of FEATURE_NAV) {
    const list = stages.get(item.stage) ?? [];
    list.push(item);
    stages.set(item.stage, list);
  }

  return (
    <nav
      className={`flex flex-col h-full bg-bg-alt border-r border-border overflow-y-auto ${
        collapsed ? 'w-[52px]' : 'w-[220px]'
      } transition-[width] duration-200`}
    >
      {/* Back to canvas link */}
      <div className="px-3 pt-4 pb-2">
        <a
          href="/app/canvas"
          className={`flex items-center gap-2 text-text-muted hover:text-text text-xs font-medium transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
          </svg>
          {!collapsed && <span>Back to Canvas</span>}
        </a>
      </div>

      <div className="flex-1 px-2 py-2 space-y-1">
        {[...stages.entries()].map(([stage, features]) => (
          <div key={stage}>
            {/* Stage header */}
            <div
              className={`flex items-center gap-2 px-2 py-2 text-text-secondary ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <span className="text-text-muted">{STAGE_ICONS[stage]}</span>
              {!collapsed && (
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  {stage}
                </span>
              )}
            </div>

            {/* Feature items */}
            {features.map((feature) => {
              const isActive = activeFeature === feature.id;
              const isDisabled = feature.comingSoon;

              return (
                <button
                  key={feature.id}
                  onClick={() => !isDisabled && onSelect(feature.id)}
                  disabled={isDisabled}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    collapsed ? 'justify-center px-2' : ''
                  } ${
                    isActive
                      ? 'bg-primary text-white font-medium'
                      : isDisabled
                        ? 'text-text-muted cursor-not-allowed opacity-50'
                        : 'text-text-secondary hover:bg-bg-card hover:text-text hover:shadow-sm'
                  }`}
                  title={collapsed ? feature.label : undefined}
                >
                  {!collapsed && <span>{feature.label}</span>}
                  {!collapsed && feature.comingSoon && (
                    <span className="ml-auto text-[10px] bg-bg-elevated text-text-muted rounded px-1.5 py-0.5">
                      Soon
                    </span>
                  )}
                  {collapsed && (
                    <span className="text-[10px] font-medium">
                      {feature.label.slice(0, 2)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
