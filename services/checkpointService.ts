import { ScriptBlock } from '../types';

export interface PipelineCheckpoint {
  topic: string;
  projectType: string;
  completedActs: number;
  totalActs: number;
  partialScript: ScriptBlock[];
  radarOutput?: string;
  researchDossier?: string;
  structureMap?: string;
  scriptOutline?: string;
  docCircle?: string;
  actPlanning?: string;
  documentaryActs?: Array<{ block: string; timecode: string; description: string }>;
  savedAt: string;
}

const DB_NAME = 'techwar_checkpoints';
const STORE_NAME = 'pipeline_state';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txOp<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(db => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const req = op(store);
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  }));
}

export async function saveCheckpoint(topic: string, data: PipelineCheckpoint): Promise<void> {
  await txOp('readwrite', store => store.put(data, topic));
}

export async function loadCheckpoint(topic: string): Promise<PipelineCheckpoint | null> {
  const result = await txOp<PipelineCheckpoint | undefined>('readonly', store => store.get(topic));
  return result ?? null;
}

export async function clearCheckpoint(topic: string): Promise<void> {
  await txOp('readwrite', store => store.delete(topic));
}

export async function hasCheckpoint(topic: string): Promise<boolean> {
  const result = await txOp<number>('readonly', store => store.count(topic));
  return result > 0;
}
