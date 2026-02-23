
/**
 * TITAN STABILITY LAYER (IndexedDB Wrapper v6.0)
 */

const DB_NAME = 'SpaceStudioNeuralDB'; // Reset Database name to clean old references
const DB_VERSION = 7; 
const STORE_NAME = 'projects';
const NOTELM_STORE = 'notelm_docs';
const NOTELM_HISTORY = 'notelm_history';
const CAMPAIGN_STORE = 'space_campaigns';

let dbInstance: IDBDatabase | null = null;
let isOpening = false;
let openPromise: Promise<IDBDatabase> | null = null;

const closeDB = () => {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (e) {}
    dbInstance = null;
  }
  isOpening = false;
  openPromise = null;
};

export const initDB = (): Promise<IDBDatabase> => {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (isOpening && openPromise) return openPromise;

  isOpening = true;
  openPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = (event) => {
        isOpening = false;
        openPromise = null;
        reject((event.target as any).error);
      };
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        dbInstance = db;
        isOpening = false;
        openPromise = null;
        resolve(db);
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(NOTELM_STORE)) db.createObjectStore(NOTELM_STORE, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(NOTELM_HISTORY)) db.createObjectStore(NOTELM_HISTORY, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(CAMPAIGN_STORE)) db.createObjectStore(CAMPAIGN_STORE, { keyPath: 'id' });
      };
    } catch (err) {
      reject(err);
    }
  });
  return openPromise;
};

const runTransaction = async <T>(
  storeName: string, 
  mode: IDBTransactionMode, 
  action: (store: IDBObjectStore) => IDBRequest
): Promise<T> => {
  const db = await initDB();
  const tx = db.transaction([storeName], mode);
  const store = tx.objectStore(storeName);
  return new Promise((resolve, reject) => {
    const req = action(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

// Campaign Specific Methods
export const saveCampaign = (campaign: any) => runTransaction(CAMPAIGN_STORE, 'readwrite', (s) => s.put(campaign));
export const getCampaigns = () => runTransaction<any[]>(CAMPAIGN_STORE, 'readonly', (s) => s.getAll());
export const deleteCampaign = (id: string) => runTransaction(CAMPAIGN_STORE, 'readwrite', (s) => s.delete(id));

export const saveProjectToDB = async (project: any): Promise<void> => {
  await runTransaction(STORE_NAME, 'readwrite', (store) => store.put(project));
};
export const getProjectByIdFromDB = async (id: string): Promise<any | null> => {
  const result = await runTransaction<any>(STORE_NAME, 'readonly', (store) => store.get(id));
  return result || null;
};
export const getAllProjectsFromDB = async (): Promise<any[]> => {
  const results = await runTransaction<any[]>(STORE_NAME, 'readonly', (store) => store.getAll());
  return (results || []).sort((a: any, b: any) => (b.lastSaved || 0) - (a.lastSaved || 0));
};
export const deleteProjectFromDB = async (id: string): Promise<void> => {
  await runTransaction(STORE_NAME, 'readwrite', (store) => store.delete(id));
};
export const clearAllProjectsFromDB = async (): Promise<void> => {
  await runTransaction(STORE_NAME, 'readwrite', (store) => store.clear());
};
export const saveNoteDoc = async (doc: any): Promise<void> => {
  await runTransaction(NOTELM_STORE, 'readwrite', (store) => store.put(doc));
};
export const getAllNoteDocs = async (): Promise<any[]> => {
  const results = await runTransaction<any[]>(NOTELM_STORE, 'readonly', (store) => store.getAll());
  return results || [];
};
export const deleteNoteDoc = async (id: string): Promise<void> => {
  await runTransaction(NOTELM_STORE, 'readwrite', (store) => store.delete(id));
};
