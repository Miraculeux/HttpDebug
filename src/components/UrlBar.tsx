import { useState } from 'react';
import { useAppStore } from '../store';
import type { HttpMethod } from '../types';
import { METHOD_COLORS } from '../types';

const METHODS: HttpMethod[] = [
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE',
];

export default function UrlBar() {
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

  const [showSaveMenu, setShowSaveMenu] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendRequest();
  };

  return (
    <form onSubmit={handleSend} className="p-3 border-b border-surface-700 bg-surface-900/50">
      <div className="flex gap-2">
        <select
          value={currentRequest.method}
          onChange={(e) =>
            setCurrentRequest({ method: e.target.value as HttpMethod })
          }
          className={`bg-surface-800 border border-surface-600 rounded-lg px-3 py-3 text-sm font-bold
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
          className="flex-1 bg-surface-800 border border-surface-600 rounded-lg px-4 py-3 text-base
            text-surface-100 placeholder-surface-500 focus:outline-none focus:border-blue-500 font-mono"
        />

        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-surface-600
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

        {/* Save button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSaveMenu(!showSaveMenu)}
            className="px-3 py-3 bg-surface-700 hover:bg-surface-600 text-surface-300
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
          className="px-3 py-3 bg-surface-700 hover:bg-surface-600 text-surface-300
            rounded-lg text-sm transition-colors"
          title="New request"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="mt-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-xs">
          {error}
        </div>
      )}
    </form>
  );
}
