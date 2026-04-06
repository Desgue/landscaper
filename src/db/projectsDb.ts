import { getDB } from './db';
import type { Project, UUID } from '../types/schema';

export async function getAllProjects(): Promise<Project[]> {
  try {
    const db = await getDB();
    const all = await db.getAll('projects');
    return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export async function getProject(id: UUID): Promise<Project | null> {
  try {
    const db = await getDB();
    const project = await db.get('projects', id);
    return project ?? null;
  } catch {
    return null;
  }
}

export async function saveProject(project: Project): Promise<void> {
  try {
    const db = await getDB();
    await db.put('projects', project);
  } catch {
    // Silently degrade — auto-save will retry on next markDirty cycle
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
  } catch {
    // Silently degrade
  }
}
