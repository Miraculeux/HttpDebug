import { useState } from 'react';
import { useAppStore } from '../store';
import type { HttpMethod } from '../types';
import { METHOD_COLORS } from '../types';
import KeyValueEditor from './KeyValueEditor';
import AuthPanel from './AuthPanel';
import BodyEditor from './BodyEditor';

const METHODS: HttpMethod[] = [
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE',
];

type Tab = 'params' | 'headers' | 'body' | 'auth';

export default function RequestBuilder() {
  const {
    currentRequest,
    setCurrentRequest,
    sendRequest,
    isLoading,
    error,
    resetRequest,
    collections,
    saveToCollection,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<Tab>('params');
  const [showSaveMenu, setShowSaveMenu] = useState(false);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'params', label: 'Params', count: currentRequest.params.filter((p) => p.enabled).length },
    { key: 'headers', label: 'Headers', count: currentRequest.headers.filter((h) => h.enabled).length },
    { key: 'body', label: 'Body' },
    { key: 'auth', label: 'Auth' },
  ];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendRequest();
  };

  return (
    <div className="flex flex-col h-full">
      {/* URL Bar */}
      <form onSubmit={handleSend} className="p-3 border-b border-surface-700">
        <div className="flex gap-2">
          <select
            value={currentRequest.method}
            onChange={(e) =>
              setCurrentRequest({ method: e.target.value as HttpMethod })
            }
            className={`bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-sm font-bold
              focus:outline-none focus:border-blue-500 ${METHOD_COLORS[currentRequest.method]}`}
          >
            {METHODS.map((m) => (
              <option key={m} value={m} className="text-surface-100">
                {m}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={currentRequest.url}
            onChange={(e) => setCurrentRequest({ url: e.target.value })}
            placeholder="https://api.example.com/endpoint"
            className="flex-1 bg-surface-800 border border-surface-600 rounded-lg px-4 py-2 text-sm
              text-surface-100 placeholder-surface-500 focus:outline-none focus:border-blue-500 font-mono"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-surface-600
              text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending
              </>
            ) : (
              'Send'
            )}
          </button>

          {/* Save & New buttons */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSaveMenu(!showSaveMenu)}
              className="px-3 py-2 bg-surface-700 hover:bg-surface-600 text-surface-300
                rounded-lg text-sm transition-colors"
              title="Save to collection"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            </button>

            {showSaveMenu && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-surface-800 border border-surface-600
                rounded-lg shadow-xl z-50 py-1">
                {collections.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-surface-500">No collections yet</p>
                ) : (
                  collections.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        saveToCollection(c.id);
                        setShowSaveMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-surface-300 hover:bg-surface-700 hover:text-surface-100"
                    >
                      {c.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={resetRequest}
            className="px-3 py-2 bg-surface-700 hover:bg-surface-600 text-surface-300
              rounded-lg text-sm transition-colors"
            title="New request"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* Request name */}
        <input
          type="text"
          value={currentRequest.name}
          onChange={(e) => setCurrentRequest({ name: e.target.value })}
          placeholder="Request name"
          className="mt-2 w-full bg-transparent text-sm text-surface-400 placeholder-surface-600
            focus:outline-none focus:text-surface-200 border-none"
        />

        {error && (
          <div className="mt-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">
            {error}
          </div>
        )}
      </form>

      {/* Tabs */}
      <div className="flex border-b border-surface-700">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-surface-400 hover:text-surface-200'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-surface-700 rounded-full text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-3 flex flex-col min-h-0">
        {activeTab === 'params' && (
          <KeyValueEditor
            items={currentRequest.params}
            onChange={(params) => setCurrentRequest({ params })}
            keyPlaceholder="Parameter name"
            valuePlaceholder="Parameter value"
          />
        )}
        {activeTab === 'headers' && (
          <KeyValueEditor
            items={currentRequest.headers}
            onChange={(headers) => setCurrentRequest({ headers })}
            keyPlaceholder="Header name"
            valuePlaceholder="Header value"
          />
        )}
        {activeTab === 'body' && <div className="flex flex-col flex-1 min-h-0"><BodyEditor /></div>}
        {activeTab === 'auth' && <AuthPanel />}
      </div>
    </div>
  );
}
