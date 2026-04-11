import fs from 'fs/promises';
import path from 'path';

const DEFAULT_STORAGE_DIR = path.join(process.cwd(), '.httpdebug');
const SETTINGS_FILE = 'settings.json';
const COLLECTIONS_DIR = 'collections';
const HISTORY_FILE = 'history.json';
const MAX_HISTORY_ENTRIES = 500;

interface Settings {
  collectionStoragePath: string;
  defaultHeaders: Array<{ id: string; key: string; value: string; enabled: boolean }>;
  timeout: number;
  followRedirects: boolean;
  validateSSL: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  collectionStoragePath: path.join(DEFAULT_STORAGE_DIR, COLLECTIONS_DIR),
  defaultHeaders: [],
  timeout: 30000,
  followRedirects: true,
  validateSSL: true,
};

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function getSettingsPath(): string {
  return path.join(DEFAULT_STORAGE_DIR, SETTINGS_FILE);
}

export async function loadSettings(): Promise<Settings> {
  try {
    await ensureDir(DEFAULT_STORAGE_DIR);
    const raw = await fs.readFile(getSettingsPath(), 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    await saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  await ensureDir(DEFAULT_STORAGE_DIR);
  await fs.writeFile(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8');
  return settings;
}

async function getCollectionsDir(): Promise<string> {
  const settings = await loadSettings();
  const dir = settings.collectionStoragePath;
  await ensureDir(dir);
  return dir;
}

export async function listCollections() {
  const dir = await getCollectionsDir();
  try {
    const files = await fs.readdir(dir);
    const collections = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const raw = await fs.readFile(path.join(dir, file), 'utf-8');
        collections.push(JSON.parse(raw));
      }
    }
    return collections;
  } catch {
    return [];
  }
}

export async function getCollection(id: string) {
  const dir = await getCollectionsDir();
  const sanitizedId = path.basename(id);
  const filePath = path.join(dir, `${sanitizedId}.json`);
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

export async function saveCollection(collection: { id: string; [key: string]: unknown }) {
  const dir = await getCollectionsDir();
  const sanitizedId = path.basename(collection.id);
  const filePath = path.join(dir, `${sanitizedId}.json`);
  await fs.writeFile(filePath, JSON.stringify(collection, null, 2), 'utf-8');
  return collection;
}

export async function deleteCollection(id: string) {
  const dir = await getCollectionsDir();
  const sanitizedId = path.basename(id);
  const filePath = path.join(dir, `${sanitizedId}.json`);
  await fs.unlink(filePath);
}

export async function updateCollectionsStoragePath(newPath: string): Promise<void> {
  const resolvedPath = path.resolve(newPath);
  await ensureDir(resolvedPath);
  const settings = await loadSettings();
  settings.collectionStoragePath = resolvedPath;
  await saveSettings(settings);
}

// History
function getHistoryPath(): string {
  return path.join(DEFAULT_STORAGE_DIR, HISTORY_FILE);
}

export async function loadHistory(): Promise<unknown[]> {
  try {
    await ensureDir(DEFAULT_STORAGE_DIR);
    const raw = await fs.readFile(getHistoryPath(), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function addToHistory(entry: { id: string; [key: string]: unknown }): Promise<void> {
  const history = await loadHistory();
  history.unshift(entry);
  if (history.length > MAX_HISTORY_ENTRIES) {
    history.length = MAX_HISTORY_ENTRIES;
  }
  await ensureDir(DEFAULT_STORAGE_DIR);
  await fs.writeFile(getHistoryPath(), JSON.stringify(history, null, 2), 'utf-8');
}

export async function clearHistory(): Promise<void> {
  await ensureDir(DEFAULT_STORAGE_DIR);
  await fs.writeFile(getHistoryPath(), '[]', 'utf-8');
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  const history = await loadHistory();
  const filtered = history.filter((e: any) => e.id !== id);
  await ensureDir(DEFAULT_STORAGE_DIR);
  await fs.writeFile(getHistoryPath(), JSON.stringify(filtered, null, 2), 'utf-8');
}
