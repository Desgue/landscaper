import { useEffect } from 'react';
import { useHistoryStore } from '../store/useHistoryStore';
import { useProjectStore } from '../store/useProjectStore';
import { useSelectionStore } from '../store/useSelectionStore';
import { useInspectorStore } from '../store/useInspectorStore';
import { useLayerStore } from '../store/useLayerStore';
import { getElementsAtPoint } from '../canvas/hitTestAll';

/** Sync the inspector store to reflect the current primary selection. */
function syncInspector(): void {
  const primaryId = useSelectionStore.getState().primaryId;
  useInspectorStore.getState().setInspectedElementId(primaryId);
}

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

      // ─── Undo: Ctrl+Z ────────────────────────────────────────────────
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
        return;
      }

      // ─── Redo: Ctrl+Y ────────────────────────────────────────────────
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // ─── Toggle snap: Ctrl+G (no shift) ──────────────────────────────
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'g') {
        e.preventDefault();
        updateProject('toggleSnap', (p) => { p.uiState.snapEnabled = !p.uiState.snapEnabled; });
        return;
      }

      // ─── Toggle grid: Ctrl+' ─────────────────────────────────────────
      if ((e.ctrlKey || e.metaKey) && e.key === "'") {
        e.preventDefault();
        updateProject('toggleGrid', (p) => { p.uiState.gridVisible = !p.uiState.gridVisible; });
        return;
      }

      // ─── Delete / Backspace — remove selected elements ────────────────
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const { selectedIds, deselectAll } = useSelectionStore.getState();
        if (selectedIds.size === 0) return;
        e.preventDefault();

        const project = useProjectStore.getState().currentProject;
        if (!project) return;

        const snapshot = structuredClone(project);
        const idsToDelete = new Set(selectedIds);

        updateProject('deleteElements', (draft) => {
          // Remove elements
          draft.elements = draft.elements.filter((el) => !idsToDelete.has(el.id));

          // Clean up groups: remove deleted IDs from groups, delete empty groups
          draft.groups = draft.groups
            .map((g) => ({
              ...g,
              elementIds: g.elementIds.filter((id) => !idsToDelete.has(id)),
            }))
            .filter((g) => g.elementIds.length > 0);
        });

        useHistoryStore.getState().pushHistory(snapshot);
        useProjectStore.getState().markDirty();
        deselectAll();
        syncInspector();
        return;
      }

      // ─── Copy: Ctrl+C ────────────────────────────────────────────────
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
        const { selectedIds, setClipboard } = useSelectionStore.getState();
        if (selectedIds.size === 0) return;
        e.preventDefault();

        const project = useProjectStore.getState().currentProject;
        if (!project) return;

        const selectedElements = project.elements.filter((el) => selectedIds.has(el.id));
        const cloned = structuredClone(selectedElements);
        setClipboard({ elements: cloned });
        return;
      }

      // ─── Paste: Ctrl+V ───────────────────────────────────────────────
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !e.shiftKey) {
        const { clipboard, selectMultiple } = useSelectionStore.getState();
        if (!clipboard || clipboard.elements.length === 0) return;
        e.preventDefault();

        const project = useProjectStore.getState().currentProject;
        if (!project) return;

        const snapshot = structuredClone(project);
        const now = new Date().toISOString();

        // Offset by +20cm and snap to 10cm grid
        const offsetX = 20;
        const offsetY = 20;

        const newIds: string[] = [];
        const newElements = clipboard.elements.map((el) => {
          const newId = crypto.randomUUID();
          newIds.push(newId);
          return {
            ...structuredClone(el),
            id: newId,
            groupId: null,
            x: Math.round((el.x + offsetX) / 10) * 10,
            y: Math.round((el.y + offsetY) / 10) * 10,
            createdAt: now,
            updatedAt: now,
          };
        });

        updateProject('pasteElements', (draft) => {
          draft.elements.push(...newElements);
        });

        useHistoryStore.getState().pushHistory(snapshot);
        useProjectStore.getState().markDirty();
        selectMultiple(newIds);
        syncInspector();
        return;
      }

      // ─── Tab — cycle selection through overlapping elements ───────────
      if (e.key === 'Tab') {
        e.preventDefault();
        const { lastClickWorldPos, primaryId, select, setTabCycleIndex } =
          useSelectionStore.getState();
        if (!lastClickWorldPos) return;

        const project = useProjectStore.getState().currentProject;
        if (!project) return;

        const hits = getElementsAtPoint(
          project.elements,
          project.layers,
          lastClickWorldPos.x,
          lastClickWorldPos.y,
        );
        if (hits.length === 0) return;

        // Find current selection in hits list
        const currentIdx = hits.findIndex((el) => el.id === primaryId);
        let nextIdx: number;
        if (currentIdx === -1) {
          nextIdx = 0;
        } else {
          nextIdx = (currentIdx + 1) % hits.length;
        }

        select(hits[nextIdx].id);
        setTabCycleIndex(nextIdx);
        syncInspector();
        return;
      }

      // ─── Escape — exit group editing or deselect all ──────────────────
      if (e.key === 'Escape') {
        const { groupEditingId, setGroupEditing, deselectAll } = useSelectionStore.getState();
        if (groupEditingId) {
          setGroupEditing(null);
        } else {
          deselectAll();
        }
        syncInspector();
        return;
      }

      // ─── Group: Ctrl+Shift+G ─────────────────────────────────────────
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'G') {
        e.preventDefault();

        const { selectedIds } = useSelectionStore.getState();
        if (selectedIds.size < 2) return;

        const project = useProjectStore.getState().currentProject;
        if (!project) return;

        const selectedElements = project.elements.filter((el) => selectedIds.has(el.id));

        // Block if any selected element already belongs to a group
        if (selectedElements.some((el) => el.groupId !== null)) {
          alert('Some elements are already in a group. Ungroup them first (Ctrl+Shift+U).');
          return;
        }

        const activeLayerId = useLayerStore.getState().activeLayerId;
        if (!activeLayerId) return;

        const snapshot = structuredClone(project);

        // Check if elements span multiple layers
        const uniqueLayerIds = new Set(selectedElements.map((el) => el.layerId));
        const needsLayerMove = uniqueLayerIds.size > 1 || !uniqueLayerIds.has(activeLayerId);

        const newGroupId = crypto.randomUUID();
        const selectedIdArray = Array.from(selectedIds);

        updateProject('groupElements', (draft) => {
          // Move elements to active layer if needed
          if (needsLayerMove) {
            for (const el of draft.elements) {
              if (selectedIds.has(el.id)) {
                el.layerId = activeLayerId;
              }
            }
          }

          // Set groupId on each selected element
          for (const el of draft.elements) {
            if (selectedIds.has(el.id)) {
              el.groupId = newGroupId;
              el.updatedAt = new Date().toISOString();
            }
          }

          // Create the group record
          draft.groups.push({
            id: newGroupId,
            name: null,
            elementIds: selectedIdArray,
            layerId: activeLayerId,
          });
        });

        useHistoryStore.getState().pushHistory(snapshot);
        useProjectStore.getState().markDirty();

        if (needsLayerMove) {
          const activeLayer = project.layers.find((l) => l.id === activeLayerId);
          const layerName = activeLayer?.name ?? 'active layer';
          alert(`Elements moved to ${layerName} for grouping.`);
        }

        return;
      }

      // ─── Ungroup: Ctrl+Shift+U ───────────────────────────────────────
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'U') {
        e.preventDefault();

        const { selectedIds } = useSelectionStore.getState();
        if (selectedIds.size === 0) return;

        const project = useProjectStore.getState().currentProject;
        if (!project) return;

        // Find all groups that contain any selected element
        const groupsToRemove = new Set<string>();
        for (const el of project.elements) {
          if (selectedIds.has(el.id) && el.groupId) {
            groupsToRemove.add(el.groupId);
          }
        }

        if (groupsToRemove.size === 0) return;

        const snapshot = structuredClone(project);

        // Collect all element IDs that belong to these groups (for clearing groupId)
        const allMemberIds = new Set<string>();
        for (const group of project.groups) {
          if (groupsToRemove.has(group.id)) {
            for (const memberId of group.elementIds) {
              allMemberIds.add(memberId);
            }
          }
        }

        updateProject('ungroupElements', (draft) => {
          // Remove group records
          draft.groups = draft.groups.filter((g) => !groupsToRemove.has(g.id));

          // Clear groupId on all member elements
          for (const el of draft.elements) {
            if (allMemberIds.has(el.id)) {
              el.groupId = null;
              el.updatedAt = new Date().toISOString();
            }
          }
        });

        useHistoryStore.getState().pushHistory(snapshot);
        useProjectStore.getState().markDirty();
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo, updateProject]);
}
