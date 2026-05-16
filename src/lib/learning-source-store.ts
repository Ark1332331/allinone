'use client';

export interface StoredLearningSourceArtifact {
  materialId: string;
  filename: string;
  mimeType?: string;
  size: number;
  lastUpdatedAt: number;
  file: Blob;
}

const DB_NAME = 'allinone-learning-source-artifacts';
const DB_VERSION = 1;
const STORE_NAME = 'material-files';

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'materialId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDatabase().then((database) => {
    if (!database) {
      throw new Error('IndexedDB is not available in this browser.');
    }

    return new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      const request = callback(store);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
    });
  });
}

export async function saveLearningMaterialSourceFile(
  materialId: string,
  file: File
): Promise<void> {
  const database = await openDatabase();
  if (!database) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({
      materialId,
      filename: file.name,
      mimeType: file.type || undefined,
      size: file.size,
      lastUpdatedAt: Date.now(),
      file,
    } satisfies StoredLearningSourceArtifact);

    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();
  });
}

export async function loadLearningMaterialSourceFile(
  materialId: string
): Promise<StoredLearningSourceArtifact | null> {
  try {
    const result = await withStore<StoredLearningSourceArtifact | undefined>(
      'readonly',
      (store) => store.get(materialId) as IDBRequest<StoredLearningSourceArtifact | undefined>
    );

    return result ?? null;
  } catch {
    return null;
  }
}

export async function deleteLearningMaterialSourceFile(
  materialId: string
): Promise<void> {
  try {
    await withStore<undefined>(
      'readwrite',
      (store) => store.delete(materialId) as IDBRequest<undefined>
    );
  } catch {
  }
}
