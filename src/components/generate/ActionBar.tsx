import { RotateCcw, Pencil, Layers, Download } from 'lucide-react';
import { useGenerateStore } from '../../store/useGenerateStore';
import type { FeatureId } from '../../types/generate';

export function ActionBar() {
  const setActiveFeature = useGenerateStore((s) => s.setActiveFeature);
  const clearResult = useGenerateStore((s) => s.clearResult);

  const handleEdit = (feature: FeatureId) => {
    setActiveFeature(feature);
  };

  return (
    <div className="flex items-center justify-center gap-2 py-3 px-4 border-t border-border bg-bg-card">
      <button
        onClick={clearResult}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text hover:bg-bg-elevated rounded-md transition-colors"
      >
        <RotateCcw size={14} />
        Regenerate
      </button>

      <DropdownButton
        icon={<Pencil size={14} />}
        label="Edit"
        items={[
          { label: 'Chat Edit', onClick: () => handleEdit('conversational') },
          { label: 'Zone Edit', onClick: () => handleEdit('zone') },
          { label: 'Materials', onClick: () => handleEdit('material') },
          { label: 'Plants', onClick: () => handleEdit('plants') },
        ]}
      />

      <DropdownButton
        icon={<Layers size={14} />}
        label="Variants"
        items={[
          { label: 'Seasonal & Lighting', onClick: () => handleEdit('seasonal') },
          { label: 'Multi-View', onClick: () => handleEdit('multi-view') },
        ]}
      />

      <button
        onClick={() => setActiveFeature('export')}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text hover:bg-bg-elevated rounded-md transition-colors"
      >
        <Download size={14} />
        Export
      </button>
    </div>
  );
}

interface DropdownItem {
  label: string;
  onClick: () => void;
}

function DropdownButton({
  icon,
  label,
  items,
}: {
  icon: React.ReactNode;
  label: string;
  items: DropdownItem[];
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text hover:bg-bg-elevated rounded-md transition-colors"
      >
        {icon}
        {label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 mb-1 bg-bg-card rounded-lg shadow-md border border-border py-1 z-50 min-w-[160px]">
            {items.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  item.onClick();
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-text-secondary hover:text-text hover:bg-bg-elevated transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

import React from 'react';
