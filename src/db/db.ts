import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';

const DB_NAME = 'landscape-planner';
const DB_VERSION = 1;

interface UndoHistoryRecord {
  projectId: string;
  actions: unknown[];
}

interface LandscapePlannerDB {
  projects: {
    key: string;
    value: import('../types/schema').Project;
  };
  undoHistory: {
    key: string;
    value: UndoHistoryRecord;
  };
}

let dbPromise: Promise<IDBPDatabase<LandscapePlannerDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<LandscapePlannerDB>> {
  if (!dbPromise) {
    dbPromise = openDB<LandscapePlannerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('undoHistory')) {
          db.createObjectStore('undoHistory', { keyPath: 'projectId' });
        }
      },
    });
    // Reset cache on failure so the next call retries (e.g. after private-browsing rejection)
    dbPromise.catch((err) => {
      console.error('[db] IndexedDB open failed:', err);
      dbPromise = null;
    });
  }
  return dbPromise;
}
