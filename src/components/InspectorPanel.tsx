import { useState } from 'react'

export default function InspectorPanel() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className="flex flex-col bg-white border-l border-gray-200 flex-shrink-0 overflow-hidden transition-all"
      style={{ width: collapsed ? 0 : 280 }}
    >
      {!collapsed && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 flex-shrink-0">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Inspector
            </span>
            <button
              onClick={() => setCollapsed(true)}
              className="text-gray-400 hover:text-gray-600 text-sm"
              title="Collapse inspector"
            >
              ›
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Nothing selected.
          </div>
        </>
      )}

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center justify-center w-full bg-white border-l border-gray-200 text-gray-500 hover:bg-gray-50"
          style={{ height: '100%', width: 16 }}
          title="Expand inspector"
        >
          ‹
        </button>
      )}
    </div>
  )
}
