import { create } from 'zustand';
import type {
  HttpRequest,
  HttpResponse,
  Collection,
  AppSettings,
  KeyValuePair,
  HistoryEntry,
} from './types';
import { createEmptyRequest, DEFAULT_AUTH, DEFAULT_BODY } from './types';
import * as api from './api';

interface AppState {
  // Current request
  currentRequest: HttpRequest;
  currentResponse: HttpResponse | null;
  isLoading: boolean;
  error: string | null;

  // Collections
  collections: Collection[];
  activeCollectionId: string | null;
  activeRequestId: string | null;

  // Settings
  settings: AppSettings;
  showSettings: boolean;

  // UI state
  sidebarOpen: boolean;

  // History
  history: HistoryEntry[];

  // Actions - Request
  setCurrentRequest: (req: Partial<HttpRequest>) => void;
  resetRequest: () => void;
  sendRequest: () => Promise<void>;

  // Actions - Collections
  loadCollections: () => Promise<void>;
  createCollection: (name: string, description?: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  saveToCollection: (collectionId: string) => Promise<void>;
  loadFromCollection: (collectionId: string, requestId: string) => void;
  deleteFromCollection: (collectionId: string, requestId: string) => Promise<void>;
  importCollection: (data: unknown) => Promise<void>;
  exportCollection: (id: string) => Promise<Collection>;

  // Actions - Settings
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  setShowSettings: (show: boolean) => void;

  // Actions - UI
  toggleSidebar: () => void;

  // Actions - History
  loadHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
  deleteHistoryEntry: (id: string) => Promise<void>;
  loadFromHistory: (entry: HistoryEntry) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentRequest: createEmptyRequest(),
  currentResponse: null,
  isLoading: false,
  error: null,

  collections: [],
  activeCollectionId: null,
  activeRequestId: null,

  settings: {
    collectionStoragePath: '',
    defaultHeaders: [],
    timeout: 30000,
    followRedirects: true,
    validateSSL: true,
  },
  showSettings: false,
  sidebarOpen: true,
  history: [],

  setCurrentRequest: (req) =>
    set((state) => ({
      currentRequest: { ...state.currentRequest, ...req },
    })),

  resetRequest: () =>
    set({
      currentRequest: createEmptyRequest(),
      currentResponse: null,
      error: null,
      activeRequestId: null,
    }),

  sendRequest: async () => {
    const { currentRequest, settings } = get();
    if (!currentRequest.url) {
      set({ error: 'URL is required' });
      return;
    }
    set({ isLoading: true, error: null, currentResponse: null });
    try {
      const response = await api.sendRequest(currentRequest, settings);
      set({ currentResponse: response, isLoading: false });

      // Auto-save to history
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        request: { ...currentRequest },
        response,
        timestamp: new Date().toISOString(),
      };
      api.addHistoryEntry(entry).catch(() => {});
      set((state) => ({ history: [entry, ...state.history].slice(0, 500) }));
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  loadCollections: async () => {
    try {
      const collections = await api.fetchCollections();
      set({ collections });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  createCollection: async (name, description) => {
    try {
      const collection = await api.createCollection(name, description);
      set((state) => ({ collections: [...state.collections, collection] }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  deleteCollection: async (id) => {
    try {
      await api.removeCollection(id);
      set((state) => ({
        collections: state.collections.filter((c) => c.id !== id),
        activeCollectionId:
          state.activeCollectionId === id ? null : state.activeCollectionId,
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  saveToCollection: async (collectionId) => {
    const { currentRequest, currentResponse } = get();
    try {
      const saved = await api.addRequestToCollection(
        collectionId,
        currentRequest,
        currentResponse || undefined
      );
      set((state) => ({
        collections: state.collections.map((c) =>
          c.id === collectionId
            ? { ...c, requests: [...c.requests, saved] }
            : c
        ),
        activeCollectionId: collectionId,
        activeRequestId: saved.id,
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  loadFromCollection: (collectionId, requestId) => {
    const { collections } = get();
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) return;
    const saved = collection.requests.find((r) => r.id === requestId);
    if (!saved) return;
    set({
      currentRequest: { ...saved.request },
      currentResponse: saved.response || null,
      activeCollectionId: collectionId,
      activeRequestId: requestId,
    });
  },

  deleteFromCollection: async (collectionId, requestId) => {
    try {
      await api.deleteRequestFromCollection(collectionId, requestId);
      set((state) => ({
        collections: state.collections.map((c) =>
          c.id === collectionId
            ? { ...c, requests: c.requests.filter((r) => r.id !== requestId) }
            : c
        ),
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  importCollection: async (data) => {
    try {
      const collection = await api.importCollection(data);
      set((state) => ({ collections: [...state.collections, collection] }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  exportCollection: async (id) => {
    return api.exportCollection(id);
  },

  loadSettings: async () => {
    try {
      const settings = await api.fetchSettings();
      set({ settings });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  updateSettings: async (newSettings) => {
    try {
      const settings = await api.updateSettings(newSettings);
      set({ settings });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  setShowSettings: (show) => set({ showSettings: show }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  loadHistory: async () => {
    try {
      const history = await api.fetchHistory();
      set({ history });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  clearHistory: async () => {
    try {
      await api.clearHistory();
      set({ history: [] });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  deleteHistoryEntry: async (id) => {
    try {
      await api.deleteHistoryEntry(id);
      set((state) => ({
        history: state.history.filter((h) => h.id !== id),
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  loadFromHistory: (entry) => {
    set({
      currentRequest: { ...entry.request },
      currentResponse: entry.response || null,
      activeCollectionId: null,
      activeRequestId: null,
    });
  },
}));
