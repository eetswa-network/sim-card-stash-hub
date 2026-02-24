import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface SimCardStashDB extends DBSchema {
  sim_cards: {
    key: string;
    value: {
      id: string;
      user_id: string;
      phone_number: string;
      sim_number: string;
      sim_type: string;
      carrier: string | null;
      status: string | null;
      location: string | null;
      login: string | null;
      password: string | null;
      notes: string | null;
      account_id: string | null;
      profile_id: string | null;
      created_at: string;
      updated_at: string;
      account?: any;
    };
    indexes: { "by-user": string };
  };
  sim_card_usage: {
    key: string;
    value: {
      id: string;
      sim_card_id: string;
      user_id: string;
      name: string;
      use_purpose: string;
      created_at: string;
      updated_at: string;
    };
    indexes: { "by-sim-card": string };
  };
  sync_meta: {
    key: string;
    value: {
      key: string;
      lastSynced: string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<SimCardStashDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<SimCardStashDB>("simcardstash-offline", 1, {
      upgrade(db) {
        const simStore = db.createObjectStore("sim_cards", { keyPath: "id" });
        simStore.createIndex("by-user", "user_id");

        const usageStore = db.createObjectStore("sim_card_usage", { keyPath: "id" });
        usageStore.createIndex("by-sim-card", "sim_card_id");

        db.createObjectStore("sync_meta", { keyPath: "key" });
      },
    });
  }
  return dbPromise;
}

export async function cacheSimCards(cards: any[]) {
  const db = await getDb();
  const tx = db.transaction("sim_cards", "readwrite");
  // Clear existing and replace with fresh data
  await tx.store.clear();
  for (const card of cards) {
    await tx.store.put(card);
  }
  await tx.done;

  // Update sync timestamp
  const metaTx = db.transaction("sync_meta", "readwrite");
  await metaTx.store.put({ key: "sim_cards", lastSynced: new Date().toISOString() });
  await metaTx.done;
}

export async function getCachedSimCards(): Promise<any[]> {
  const db = await getDb();
  return db.getAll("sim_cards");
}

export async function cacheUsageData(simCardId: string, usageEntries: any[]) {
  const db = await getDb();
  const tx = db.transaction("sim_card_usage", "readwrite");
  // Delete existing entries for this sim card
  const index = tx.store.index("by-sim-card");
  let cursor = await index.openCursor(simCardId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  // Add new entries
  for (const entry of usageEntries) {
    await tx.store.put(entry);
  }
  await tx.done;
}

export async function getCachedUsageData(simCardId: string): Promise<any[]> {
  const db = await getDb();
  return db.getAllFromIndex("sim_card_usage", "by-sim-card", simCardId);
}

export async function getLastSyncTime(key: string): Promise<string | null> {
  const db = await getDb();
  const meta = await db.get("sync_meta", key);
  return meta?.lastSynced || null;
}

export function isOnline(): boolean {
  return navigator.onLine;
}
