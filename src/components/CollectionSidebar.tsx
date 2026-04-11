import { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { METHOD_COLORS } from '../types';

export default function CollectionSidebar() {
  const {
    collections,
    createCollection,
    deleteCollection,
    loadFromCollection,
    deleteFromCollection,
    importCollection,
    exportCollection,
    activeCollectionId,
    activeRequestId,
    history,
    loadFromHistory,
    clearHistory,
    deleteHistoryEntry,
  } = useAppStore();

  const [newCollectionName, setNewCollectionName] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'collections' | 'history'>('collections');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = () => {
    if (newCollectionName.trim()) {
      createCollection(newCollectionName.trim());
      setNewCollectionName('');
      setShowNewForm(false);
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importCollection(data);
    } catch {
      alert('Invalid collection file');
    }
    e.target.value = '';
  };

  const handleExport = async (id: string) => {
    try {
      const data = await exportCollection(id);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = data.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      a.href = url;
      a.download = `${safeName}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export collection');
    }
  };

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-surface-700">
        <button
          onClick={() => setActiveTab('collections')}
          className={`flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'collections'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-surface-400 hover:text-surface-200'
          }`}
        >
          Collections
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-surface-400 hover:text-surface-200'
          }`}
        >
          History
          {history.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-surface-700 rounded-full text-[10px]">
              {history.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'collections' && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-surface-700">
            <h2 className="text-sm font-semibold text-surface-300">Collections</h2>
            <div className="flex gap-1">
              <button
                onClick={handleImport}
                className="p-1 text-surface-400 hover:text-surface-200 rounded hover:bg-surface-700"
                title="Import collection"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              <button
                onClick={() => setShowNewForm(!showNewForm)}
                className="p-1 text-surface-400 hover:text-surface-200 rounded hover:bg-surface-700"
                title="New collection"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </div>

          {/* New collection form */}
          {showNewForm && (
            <div className="p-3 border-b border-surface-700 bg-surface-800/50">
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Collection name"
                autoFocus
                className="w-full bg-surface-800 border border-surface-600 rounded px-2 py-1.5 text-sm
                  text-surface-100 placeholder-surface-500 focus:outline-none focus:border-blue-500 mb-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowNewForm(false);
                    setNewCollectionName('');
                  }}
                  className="px-3 py-1 text-surface-400 hover:text-surface-200 text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Collection list */}
          <div className="flex-1 overflow-auto">
            {collections.length === 0 ? (
              <div className="p-4 text-center text-surface-500 text-sm">
                <p>No collections yet.</p>
                <p className="text-xs mt-1">Create one or import from a file.</p>
              </div>
            ) : (
              <ul className="py-1">
                {collections.map((collection) => {
                  const isExpanded = expandedIds.has(collection.id);

                  return (
                    <li key={collection.id}>
                      <div
                        className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer group hover:bg-surface-800
                          ${activeCollectionId === collection.id ? 'bg-surface-800' : ''}`}
                      >
                        <button
                          onClick={() => toggleExpand(collection.id)}
                          className="text-surface-500 flex-shrink-0"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          >
                            <path d="M8 5l8 7-8 7z" />
                          </svg>
                        </button>
                        <span
                          onClick={() => toggleExpand(collection.id)}
                          className="flex-1 text-sm text-surface-300 truncate"
                        >
                          {collection.name}
                          <span className="ml-1.5 text-xs text-surface-500">
                            ({collection.requests.length})
                          </span>
                        </span>

                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleExport(collection.id)}
                            className="p-1 text-surface-500 hover:text-blue-400 rounded"
                            title="Export"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${collection.name}"?`)) {
                                deleteCollection(collection.id);
                              }
                            }}
                            className="p-1 text-surface-500 hover:text-red-400 rounded"
                            title="Delete"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <ul className="ml-5">
                          {collection.requests.length === 0 ? (
                            <li className="px-3 py-1.5 text-xs text-surface-600 italic">
                              No saved requests
                            </li>
                          ) : (
                            collection.requests.map((saved) => (
                              <li
                                key={saved.id}
                                onClick={() =>
                                  loadFromCollection(collection.id, saved.id)
                                }
                                className={`flex items-center gap-2 px-3 py-1 cursor-pointer group hover:bg-surface-800 rounded
                                  ${activeRequestId === saved.id ? 'bg-surface-800' : ''}`}
                              >
                                <span
                                  className={`text-[10px] font-bold w-10 flex-shrink-0 ${
                                    METHOD_COLORS[saved.request.method]
                                  }`}
                                >
                                  {saved.request.method}
                                </span>
                                <span className="text-xs text-surface-400 truncate flex-1">
                                  {saved.request.name || saved.request.url}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteFromCollection(collection.id, saved.id);
                                  }}
                                  className="p-0.5 text-surface-600 hover:text-red-400 opacity-0 group-hover:opacity-100"
                                  title="Delete request"
                                >
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                  </svg>
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <>
          {/* History header */}
          <div className="flex items-center justify-between p-3 border-b border-surface-700">
            <h2 className="text-sm font-semibold text-surface-300">History</h2>
            {history.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear all history?')) clearHistory();
                }}
                className="text-[10px] text-surface-500 hover:text-red-400 px-2 py-0.5 rounded hover:bg-surface-800"
              >
                Clear all
              </button>
            )}
          </div>

          {/* History list */}
          <div className="flex-1 overflow-auto">
            {history.length === 0 ? (
              <div className="p-4 text-center text-surface-500 text-sm">
                <p>No history yet.</p>
                <p className="text-xs mt-1">Requests are saved automatically.</p>
              </div>
            ) : (
              <ul className="py-1">
                {history.map((entry) => (
                  <li
                    key={entry.id}
                    onClick={() => loadFromHistory(entry)}
                    className="flex items-center gap-2 px-3 py-1.5 cursor-pointer group hover:bg-surface-800"
                  >
                    <span
                      className={`text-[10px] font-bold w-10 flex-shrink-0 ${
                        METHOD_COLORS[entry.request.method]
                      }`}
                    >
                      {entry.request.method}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-surface-300 truncate">
                        {entry.request.url}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-[10px] font-medium ${
                            entry.response.status < 300
                              ? 'text-green-400'
                              : entry.response.status < 400
                              ? 'text-yellow-400'
                              : 'text-red-400'
                          }`}
                        >
                          {entry.response.status}
                        </span>
                        <span className="text-[10px] text-surface-600">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteHistoryEntry(entry.id);
                      }}
                      className="p-0.5 text-surface-600 hover:text-red-400 opacity-0 group-hover:opacity-100"
                      title="Delete"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
