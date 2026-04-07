import { getDB } from './db';
import type { Project, ProjectExport, Registries, UUID } from '../types/schema';

export async function getAllProjects(): Promise<Project[]> {
  try {
    const db = await getDB();
    const all = await db.getAll('projects');
    return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch (err) {
    console.error('[projectsDb] getAllProjects failed:', err);
    return [];
  }
}

export async function getProject(id: UUID): Promise<Project | null> {
  try {
    const db = await getDB();
    const project = await db.get('projects', id);
    return project ?? null;
  } catch (err) {
    console.error('[projectsDb] getProject failed: id=%s', id, err);
    return null;
  }
}

export async function saveProject(project: Project): Promise<void> {
  try {
    const db = await getDB();
    await db.put('projects', project);
  } catch (err) {
    console.error('[projectsDb] saveProject failed: id=%s', project.id, err);
  }
}

export async function deleteProject(id: UUID): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(['projects', 'undoHistory'], 'readwrite');
    await Promise.all([
      tx.objectStore('projects').delete(id),
      tx.objectStore('undoHistory').delete(id),
      tx.done,
    ]);
  } catch (err) {
    console.error('[projectsDb] deleteProject failed: id=%s', id, err);
  }
}

export function exportProjectAsJSON(project: Project, registries: Registries): void {
  console.debug('[projectsDb] exportProjectAsJSON: project=%s', project.id);
  try {
    // Strip yardPhoto if present (future-proofing — base64 images bloat exports)
    const cleanProject = { ...project };
    if ('yardPhoto' in cleanProject) {
      delete (cleanProject as Record<string, unknown>)['yardPhoto'];
    }

    const exportData: ProjectExport = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      project: cleanProject,
      registries,
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const safeName = project.name.replace(/[^a-zA-Z0-9 _-]/g, '_').trim() || 'project';
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error('[projectsDb] exportProjectAsJSON failed: project=%s', project.id, err);
  }
}
