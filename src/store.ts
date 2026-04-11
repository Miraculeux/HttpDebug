import { create } from 'zustand';
import type {
  HttpRequest,
  HttpResponse,
  Collection,
  AppSettings,
  KeyValuePair,
  HistoryEntry,
  RequestTab,
} from './types';
import { createEmptyRequest, createTab, DEFAULT_AUTH, DEFAULT_BODY } from './types';
import * as api from './api';

interface AppState {
  // Tabs
  tabs: RequestTab[];
  activeTabId: string;

  // Derived from active tab (convenience getters delegated via actions)
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

  // Actions - Tabs
  addTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;

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
  openInNewTab: (entry: HistoryEntry) => void;
}

export const useAppStore = create<AppState>((set, get) => {
  const initialTab = createTab();

  const updateActiveTab = (updates: Partial<RequestTab>) => {
    const { tabs, activeTabId } = get();
    const newTabs = tabs.map((t) =>
      t.id === activeTabId ? { ...t, ...updates } : t
    );
    const active = newTabs.find((t) => t.id === activeTabId)!;
    return {
      tabs: newTabs,
      currentRequest: active.request,
      currentResponse: active.response,
      isLoading: active.isLoading,
      error: active.error,
    };
  };

  const syncFromTab = (tabs: RequestTab[], activeTabId: string) => {
    const active = tabs.find((t) => t.id === activeTabId)!;
    return {
      tabs,
      activeTabId,
      currentRequest: active.request,
      currentResponse: active.response,
      isLoading: active.isLoading,
      error: active.error,
    };
  };

  return {
  tabs: [initialTab],
  activeTabId: initialTab.id,
  currentRequest: initialTab.request,
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

  addTab: () => {
    const tab = createTab();
    set((state) => {
      const newTabs = [...state.tabs, tab];
      return syncFromTab(newTabs, tab.id);
    });
  },

  closeTab: (id) => {
    set((state) => {
      if (state.tabs.length === 1) {
        // Can't close last tab — reset it instead
        const tab = createTab();
        return syncFromTab([tab], tab.id);
      }
      const newTabs = state.tabs.filter((t) => t.id !== id);
      const newActiveId =
        state.activeTabId === id
          ? newTabs[Math.min(state.tabs.findIndex((t) => t.id === id), newTabs.length - 1)].id
          : state.activeTabId;
      return syncFromTab(newTabs, newActiveId);
    });
  },

  setActiveTab: (id) => {
    set((state) => syncFromTab(state.tabs, id));
  },

  setCurrentRequest: (req) =>
    set((state) => {
      const updatedRequest = { ...state.currentRequest, ...req };
      const name = updatedRequest.url
        ? `${updatedRequest.method} ${updatedRequest.url.replace(/^https?:\/\//, '').slice(0, 30)}`
        : updatedRequest.name || 'New Request';
      return updateActiveTab({ request: updatedRequest, name });
    }),

  resetRequest: () => {
    const req = createEmptyRequest();
    set(() => updateActiveTab({
      request: req,
      response: null,
      error: null,
      name: 'New Request',
    }));
    set({ activeRequestId: null });
  },

  sendRequest: async () => {
    const { currentRequest, settings, activeTabId } = get();
    if (!currentRequest.url) {
      set(() => updateActiveTab({ error: 'URL is required' }));
      return;
    }
    set(() => updateActiveTab({ isLoading: true, error: null, response: null }));
    try {
      const response = await api.sendRequest(currentRequest, settings);
      // Only update if still on the same tab
      if (get().activeTabId === activeTabId) {
        set(() => updateActiveTab({ response, isLoading: false }));
      } else {
        // Update the original tab directly
        set((state) => {
          const newTabs = state.tabs.map((t) =>
            t.id === activeTabId ? { ...t, response, isLoading: false } : t
          );
          return { tabs: newTabs };
        });
      }

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
      const errorMsg = (err as Error).message;
      if (get().activeTabId === activeTabId) {
        set(() => updateActiveTab({ error: errorMsg, isLoading: false }));
      } else {
        set((state) => {
          const newTabs = state.tabs.map((t) =>
            t.id === activeTabId ? { ...t, error: errorMsg, isLoading: false } : t
          );
          return { tabs: newTabs };
        });
      }
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
    const name = `${saved.request.method} ${saved.request.url.replace(/^https?:\/\//, '').slice(0, 30)}` || saved.request.name;
    set(() => ({
      ...updateActiveTab({ request: { ...saved.request }, response: saved.response || null, error: null, name }),
      activeCollectionId: collectionId,
      activeRequestId: requestId,
    }));
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
    const name = `${entry.request.method} ${entry.request.url.replace(/^https?:\/\//, '').slice(0, 30)}` || 'Request';
    set(() => ({
      ...updateActiveTab({ request: { ...entry.request }, response: entry.response || null, error: null, name }),
      activeCollectionId: null,
      activeRequestId: null,
    }));
  },

  openInNewTab: (entry) => {
    const name = `${entry.request.method} ${entry.request.url.replace(/^https?:\/\//, '').slice(0, 30)}` || 'Request';
    const tab = createTab();
    tab.request = { ...entry.request };
    tab.response = entry.response || null;
    tab.name = name;
    set((state) => {
      const newTabs = [...state.tabs, tab];
      return syncFromTab(newTabs, tab.id);
    });
  },
};});
