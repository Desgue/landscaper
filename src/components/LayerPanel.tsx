import { useState } from 'react'

export default function LayerPanel() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className="flex flex-col bg-white border-l border-t border-gray-200 flex-shrink-0 overflow-hidden transition-all"
      style={{ width: collapsed ? 0 : 280, height: 200 }}
    >
      {!collapsed && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 flex-shrink-0">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Layers
            </span>
            <button
              onClick={() => setCollapsed(true)}
              className="text-gray-400 hover:text-gray-600 text-sm"
              title="Collapse layers"
            >
              ›
            </button>
          </div>

          {/* Layer list */}
          <div className="flex-1 overflow-auto">
            <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-gray-700">
              {/* Eye icon */}
              <button
                className="text-gray-400 hover:text-gray-600"
                title="Toggle visibility"
                onClick={() => {/* no-op */}}
              >
                👁
              </button>
              {/* Lock icon */}
              <button
                className="text-gray-400 hover:text-gray-600"
                title="Toggle lock"
                onClick={() => {/* no-op */}}
              >
                🔓
              </button>
              <span className="flex-1">Default</span>
            </div>
          </div>
        </>
      )}

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center justify-center w-4 h-full bg-white border-l border-gray-200 text-gray-500 hover:bg-gray-50"
          title="Expand layers"
        >
          ‹
        </button>
      )}
    </div>
  )
}
