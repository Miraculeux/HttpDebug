import { useAppStore } from '../store';
import KeyValueEditor from './KeyValueEditor';

export default function SettingsModal() {
  const { settings, updateSettings, setShowSettings } = useAppStore();

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-surface-900 border border-surface-700 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={() => setShowSettings(false)}
            className="p-1 text-surface-400 hover:text-surface-100 rounded hover:bg-surface-700"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-auto">
          {/* Collection storage path */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">
              Collection Storage Path
            </label>
            <input
              type="text"
              value={settings.collectionStoragePath}
              onChange={(e) =>
                updateSettings({ collectionStoragePath: e.target.value })
              }
              placeholder="/path/to/collections"
              className="w-full bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-sm
                font-mono text-surface-100 placeholder-surface-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-surface-500 mt-1">
              Directory where collection JSON files are stored.
            </p>
          </div>

          {/* Request timeout */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1">
              Request Timeout (ms)
            </label>
            <input
              type="number"
              value={settings.timeout}
              onChange={(e) =>
                updateSettings({ timeout: parseInt(e.target.value, 10) || 30000 })
              }
              min={1000}
              max={300000}
              className="w-full bg-surface-800 border border-surface-600 rounded-lg px-3 py-2 text-sm
                text-surface-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Toggle options */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.followRedirects}
                onChange={(e) =>
                  updateSettings({ followRedirects: e.target.checked })
                }
                className="accent-blue-500 w-4 h-4"
              />
              <div>
                <p className="text-sm text-surface-200">Follow Redirects</p>
                <p className="text-xs text-surface-500">Automatically follow HTTP redirects</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.validateSSL}
                onChange={(e) =>
                  updateSettings({ validateSSL: e.target.checked })
                }
                className="accent-blue-500 w-4 h-4"
              />
              <div>
                <p className="text-sm text-surface-200">Validate SSL Certificates</p>
                <p className="text-xs text-surface-500">Reject requests with invalid SSL certificates</p>
              </div>
            </label>
          </div>

          {/* Default headers */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              Default Headers
            </label>
            <p className="text-xs text-surface-500 mb-2">
              These headers will be included in every request unless overridden.
            </p>
            <KeyValueEditor
              items={settings.defaultHeaders}
              onChange={(defaultHeaders) => updateSettings({ defaultHeaders })}
              keyPlaceholder="Header name"
              valuePlaceholder="Header value"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-3 border-t border-surface-700">
          <button
            onClick={() => setShowSettings(false)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm
              rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
