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

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "products.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ products: [] }, null, 2));
  }
}

function readData(): StorageData {
  ensureDataDir();
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw);
}

function writeData(data: StorageData) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function getProducts(): TrackedProduct[] {
  return readData().products;
}

export function addProduct(
  product: Omit<TrackedProduct, "id" | "addedAt" | "previouslyInStock">,
): TrackedProduct {
  const data = readData();

  // Check for duplicate URL
  const existing = data.products.find((p) => p.url === product.url);
  if (existing) return existing;

  const newProduct: TrackedProduct = {
    ...product,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    addedAt: new Date().toISOString(),
    previouslyInStock: product.inStock,
  };

  data.products.push(newProduct);
  writeData(data);
  return newProduct;
}

export function updateProduct(
  id: string,
  updates: Partial<TrackedProduct>,
): TrackedProduct | null {
  const data = readData();
  const index = data.products.findIndex((p) => p.id === id);
  if (index === -1) return null;

  data.products[index] = { ...data.products[index], ...updates };
  writeData(data);
  return data.products[index];
}

export function removeProduct(id: string): boolean {
  const data = readData();
  const initialLength = data.products.length;
  data.products = data.products.filter((p) => p.id !== id);
  if (data.products.length < initialLength) {
    writeData(data);
    return true;
  }
  return false;
}

export function getRestockAlerts(): TrackedProduct[] {
  const data = readData();
  // Products that are now in stock but were previously out of stock
  return data.products.filter((p) => p.inStock && !p.previouslyInStock);
}

export function clearAlert(id: string) {
  const data = readData();
  const product = data.products.find((p) => p.id === id);
  if (product) {
    product.previouslyInStock = product.inStock;
    writeData(data);
  }
}

// ─── Email Settings ─────────────────────────────────────────────────

export interface EmailSettingsData {
  enabled: boolean;
  senderEmail: string;
  senderAppPassword: string;
  recipientEmail: string;
}

const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

function readSettings(): EmailSettingsData {
  ensureDataDir();
  if (!fs.existsSync(SETTINGS_FILE)) {
    return {
      enabled: false,
      senderEmail: "",
      senderAppPassword: "",
      recipientEmail: "",
    };
  }
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
  } catch {
    return {
      enabled: false,
      senderEmail: "",
      senderAppPassword: "",
      recipientEmail: "",
    };
  }
}

export function getEmailSettings(): EmailSettingsData {
  return readSettings();
}

export function saveEmailSettings(settings: EmailSettingsData) {
  ensureDataDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// ─── Discovery Cache ────────────────────────────────────────────────

const CACHE_FILE = path.join(DATA_DIR, "cache.json");
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

interface CacheStore {
  [key: string]: CacheEntry;
}

function readCache(): CacheStore {
  ensureDataDir();
  if (!fs.existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeCache(cache: CacheStore) {
  ensureDataDir();
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
}

export function getCache<T>(key: string): T | null {
  const cache = readCache();
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    delete cache[key];
    writeCache(cache);
    return null;
  }
  return entry.data as T;
}

export function setCache(key: string, data: unknown) {
  const cache = readCache();
  cache[key] = { data, timestamp: Date.now() };
  writeCache(cache);
}
