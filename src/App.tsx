import { useEffect } from 'react';
import { useAppStore } from './store';
import RequestBuilder from './components/RequestBuilder';
import ResponseViewer from './components/ResponseViewer';
import CollectionSidebar from './components/CollectionSidebar';
import SettingsModal from './components/SettingsModal';

export default function App() {
  const { loadCollections, loadSettings, loadHistory, sidebarOpen, toggleSidebar, showSettings } =
    useAppStore();

  useEffect(() => {
    loadCollections();
    loadSettings();
    loadHistory();
  }, []);

  return (
    <div className="h-screen flex flex-col bg-surface-950 text-surface-100">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 py-2 bg-surface-900 border-b border-surface-700">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-100"
          title="Toggle sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-blue-400">⚡</span> HttpDebug
        </h1>
        <div className="flex-1" />
        <button
          onClick={() => useAppStore.getState().setShowSettings(true)}
          className="p-1.5 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-100"
          title="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-72 border-r border-surface-700 bg-surface-900 flex-shrink-0 overflow-hidden">
            <CollectionSidebar />
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Request panel */}
            <div className="flex-1 overflow-auto border-b lg:border-b-0 lg:border-r border-surface-700">
              <RequestBuilder />
            </div>
            {/* Response panel */}
            <div className="flex-1 overflow-auto">
              <ResponseViewer />
            </div>
          </div>
        </main>
      </div>

      {showSettings && <SettingsModal />}
    </div>
  );
}
