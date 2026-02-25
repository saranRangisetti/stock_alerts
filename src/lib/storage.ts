import fs from "fs";
import path from "path";

export interface TrackedProduct {
  id: string;
  url: string;
  name: string;
  price: number | null;
  inStock: boolean;
  imageUrl: string | null;
  source: string;
  lastChecked: string | null;
  addedAt: string;
  previouslyInStock: boolean;
}

interface StorageData {
  products: TrackedProduct[];
}

export interface EmailSettingsData {
  enabled: boolean;
  senderEmail: string;
  senderAppPassword: string;
  recipientEmail: string;
}

// ─── Detect environment ──────────────────────────────────────────────

const USE_KV = !!process.env.KV_REST_API_URL;

// ─── Upstash Redis client (production) ──────────────────────────────

function getRedis() {
  const { Redis } = require("@upstash/redis");
  return new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  });
}

// ─── File system helpers (local dev) ────────────────────────────────

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "products.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const CACHE_FILE = path.join(DATA_DIR, "cache.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE))
    fs.writeFileSync(DATA_FILE, JSON.stringify({ products: [] }, null, 2));
}

function readData(): StorageData {
  ensureDataDir();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function writeData(data: StorageData) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function readSettingsFile(): EmailSettingsData {
  ensureDataDir();
  if (!fs.existsSync(SETTINGS_FILE))
    return { enabled: false, senderEmail: "", senderAppPassword: "", recipientEmail: "" };
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
  } catch {
    return { enabled: false, senderEmail: "", senderAppPassword: "", recipientEmail: "" };
  }
}

// ─── Products ────────────────────────────────────────────────────────

export async function getProductsAsync(): Promise<TrackedProduct[]> {
  if (USE_KV) {
    const redis = getRedis();
    return (await redis.get("products")) || [];
  }
  return readData().products;
}

export async function addProduct(
  product: Omit<TrackedProduct, "id" | "addedAt" | "previouslyInStock">,
): Promise<TrackedProduct> {
  const products = await getProductsAsync();
  const existing = products.find((p) => p.url === product.url);
  if (existing) return existing;

  const newProduct: TrackedProduct = {
    ...product,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    addedAt: new Date().toISOString(),
    previouslyInStock: product.inStock,
  };

  products.push(newProduct);

  if (USE_KV) {
    const redis = getRedis();
    await redis.set("products", JSON.stringify(products));
  } else {
    writeData({ products });
  }

  return newProduct;
}

export async function updateProduct(
  id: string,
  updates: Partial<TrackedProduct>,
): Promise<TrackedProduct | null> {
  const products = await getProductsAsync();
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return null;

  products[index] = { ...products[index], ...updates };

  if (USE_KV) {
    const redis = getRedis();
    await redis.set("products", JSON.stringify(products));
  } else {
    writeData({ products });
  }

  return products[index];
}

export async function removeProduct(id: string): Promise<boolean> {
  const products = await getProductsAsync();
  const filtered = products.filter((p) => p.id !== id);
  if (filtered.length === products.length) return false;

  if (USE_KV) {
    const redis = getRedis();
    await redis.set("products", JSON.stringify(filtered));
  } else {
    writeData({ products: filtered });
  }

  return true;
}

export async function clearAlert(id: string): Promise<void> {
  const products = await getProductsAsync();
  const product = products.find((p) => p.id === id);
  if (product) {
    product.previouslyInStock = product.inStock;
    if (USE_KV) {
      const redis = getRedis();
      await redis.set("products", JSON.stringify(products));
    } else {
      writeData({ products });
    }
  }
}

// ─── Email Settings ──────────────────────────────────────────────────

export async function getEmailSettings(): Promise<EmailSettingsData> {
  if (USE_KV) {
    const redis = getRedis();
    const raw = await redis.get("settings");
    if (!raw) return { enabled: false, senderEmail: "", senderAppPassword: "", recipientEmail: "" };
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  }
  return readSettingsFile();
}

export async function saveEmailSettings(settings: EmailSettingsData): Promise<void> {
  if (USE_KV) {
    const redis = getRedis();
    await redis.set("settings", JSON.stringify(settings));
  } else {
    ensureDataDir();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  }
}

// ─── Discovery Cache ─────────────────────────────────────────────────

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

interface CacheStore {
  [key: string]: CacheEntry;
}

function readCacheFile(): CacheStore {
  ensureDataDir();
  if (!fs.existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  if (USE_KV) {
    const redis = getRedis();
    const raw = await redis.get(`cache:${key}`);
    if (!raw) return null;
    const entry: CacheEntry = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      await redis.del(`cache:${key}`);
      return null;
    }
    return entry.data as T;
  }

  const cache = readCacheFile();
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    delete cache[key];
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
    return null;
  }
  return entry.data as T;
}

export async function setCache(key: string, data: unknown): Promise<void> {
  const entry: CacheEntry = { data, timestamp: Date.now() };

  if (USE_KV) {
    const redis = getRedis();
    await redis.set(`cache:${key}`, JSON.stringify(entry));
  } else {
    ensureDataDir();
    const cache = readCacheFile();
    cache[key] = entry;
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
  }
}
