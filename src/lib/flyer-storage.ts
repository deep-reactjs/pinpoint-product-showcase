/**
 * Frontend-only persistence for the interactive flyer POC.
 *
 * - localStorage: flyer metadata + hotspot coordinates (JSON, tiny).
 * - IndexedDB: the uploaded flyer image blob (can be several MB).
 *
 * All functions are SSR-safe (no-ops on the server) and never persist
 * temporary blob URLs — blobs are stored and object URLs are recreated
 * at load time.
 */

export interface Hotspot {
  id: string;
  productId: string;
  /** Normalized 0–1 coordinates relative to the flyer image. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FlyerMeta {
  fileName: string;
  width: number;
  height: number;
  savedAt: number;
}

export interface HotspotRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const META_KEY = "idflyer.meta";
const HOTSPOTS_KEY = "idflyer.hotspots";
const DB_NAME = "idflyer-db";
const STORE_NAME = "images";
const IMAGE_KEY = "current";

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `hs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function loadMeta(): FlyerMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as FlyerMeta) : null;
  } catch {
    return null;
  }
}

export function saveMeta(meta: FlyerMeta): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // storage full or unavailable — POC ignores
  }
}

export function loadHotspots(): Hotspot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HOTSPOTS_KEY);
    return raw ? (JSON.parse(raw) as Hotspot[]) : [];
  } catch {
    return [];
  }
}

export function saveHotspots(hotspots: Hotspot[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HOTSPOTS_KEY, JSON.stringify(hotspots));
  } catch {
    // ignore
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveFlyerImage(blob: Blob): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(blob, IMAGE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore — POC persistence best effort
  }
}

export async function loadFlyerImage(): Promise<Blob | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openDb();
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(IMAGE_KEY);
      request.onsuccess = () => resolve((request.result as Blob) ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return blob;
  } catch {
    return null;
  }
}

export async function clearFlyerImage(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(IMAGE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
}
