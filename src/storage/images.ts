import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface PuzzleDB extends DBSchema {
  images: {
    key: string;
    value: StoredImage;
    indexes: { "by-created": number };
  };
}

export interface StoredImage {
  id: string;
  name: string;
  createdAt: number;
  blob: Blob;
}

const DB_NAME = "my-life-puzzle";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<PuzzleDB>> | null = null;

function getDb(): Promise<IDBPDatabase<PuzzleDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PuzzleDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        const store = database.createObjectStore("images", { keyPath: "id" });
        store.createIndex("by-created", "createdAt");
      },
    });
  }
  return dbPromise;
}

export async function addImage(blob: Blob, name: string): Promise<StoredImage> {
  const db = await getDb();
  const record: StoredImage = {
    id: crypto.randomUUID(),
    name: name || "Photo",
    createdAt: Date.now(),
    blob,
  };
  await db.put("images", record);
  return record;
}

export async function listImages(): Promise<StoredImage[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex("images", "by-created");
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getImage(id: string): Promise<StoredImage | undefined> {
  const db = await getDb();
  return db.get("images", id);
}

export async function deleteImage(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("images", id);
}
