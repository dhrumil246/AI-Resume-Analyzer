const DB_NAME = "resume-db";
const DB_VERSION = 2;
const STORE_NAME = "files";
const PREVIEW_STORE_NAME = "previews";

type StoredFile = {
  id: string;
  name: string;
  type: string;
  data: ArrayBuffer;
  createdAt: string;
};

type StoredPreview = {
  id: string;
  data: string; // Base64 string
};

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(PREVIEW_STORE_NAME)) {
        db.createObjectStore(PREVIEW_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error(`Failed to open database: ${request.error?.message}`));
  });

const runTransaction = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = callback(store);

      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () =>
        reject(
          new Error(`Transaction failed: ${request.error?.message}`)
        );

      tx.oncomplete = () => db.close();
      tx.onerror = () =>
        reject(new Error(`Transaction error: ${tx.error?.message}`));
      tx.onabort = () =>
        reject(new Error(`Transaction aborted: ${tx.error?.message}`));
    } catch (error) {
      db.close();
      reject(error);
    }
  });
};

const generateId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const saveResumeFile = async (file: File): Promise<string> => {
  if (!file) {
    throw new Error("No file provided");
  }

  try {
    const data = await file.arrayBuffer();
    const stored: StoredFile = {
      id: generateId(),
      name: file.name,
      type: file.type,
      data,
      createdAt: new Date().toISOString(),
    };

    await runTransaction(STORE_NAME, "readwrite", (store) => store.put(stored));
    return stored.id;
  } catch (error) {
    throw new Error(
      `Failed to save file: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
};

export const getResumeFile = async (
  id: string
): Promise<StoredFile | undefined> => {
  if (!id) {
    throw new Error("No file ID provided");
  }

  try {
    return await runTransaction<StoredFile | undefined>(STORE_NAME, "readonly", (store) =>
      store.get(id)
    );
  } catch (error) {
    throw new Error(
      `Failed to retrieve file: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
};

export const saveResumePreview = async (
  id: string,
  data: string
): Promise<void> => {
  if (!id || !data) {
    throw new Error("ID and data are required");
  }

  try {
    const stored: StoredPreview = { id, data };
    await runTransaction(PREVIEW_STORE_NAME, "readwrite", (store) =>
      store.put(stored)
    );
  } catch (error) {
    throw new Error(
      `Failed to save preview: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

export const getResumePreview = async (
  id: string
): Promise<string | undefined> => {
  if (!id) {
    throw new Error("No preview ID provided");
  }

  try {
    const result = await runTransaction<StoredPreview | undefined>(
      PREVIEW_STORE_NAME,
      "readonly",
      (store) => store.get(id)
    );
    return result?.data;
  } catch (error) {
    console.error("Failed to get resume preview", error);
    return undefined;
  }
};

export const deleteResumePreview = async (id: string): Promise<void> => {
  if (!id) return;
  try {
    await runTransaction(PREVIEW_STORE_NAME, "readwrite", (store) =>
      store.delete(id)
    );
  } catch (error) {
    console.error("Failed to delete preview:", error);
  }
};



export const deleteResumeFile = async (id: string): Promise<void> => {
  if (!id) {
    throw new Error("No file ID provided");
  }

  try {
    await runTransaction(STORE_NAME, "readwrite", (store) => store.delete(id));
  } catch (error) {
    throw new Error(
      `Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
};

export const clearAllResumeFiles = async (): Promise<void> => {
  try {
    await runTransaction(STORE_NAME, "readwrite", (store) => store.clear());
    await runTransaction(PREVIEW_STORE_NAME, "readwrite", (store) => store.clear());
  } catch (error) {
    throw new Error(
      `Failed to clear files: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
};
