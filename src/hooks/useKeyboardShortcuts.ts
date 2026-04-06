import { useEffect } from 'react';
import { useHistoryStore } from '../store/useHistoryStore';
import { useProjectStore } from '../store/useProjectStore';

export function useKeyboardShortcuts(): void {
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);
  const updateProject = useProjectStore((s) => s.updateProject);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }

      // Ctrl+G → toggle snap
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        updateProject((p) => { p.uiState.snapEnabled = !p.uiState.snapEnabled; });
      }

      // Ctrl+' → toggle grid visibility
      // Handled here (not in GridLayer) so the shortcut works even when the grid is hidden
      if ((e.ctrlKey || e.metaKey) && e.key === "'") {
        e.preventDefault();
        updateProject((p) => { p.uiState.gridVisible = !p.uiState.gridVisible; });
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo, updateProject]);
}
