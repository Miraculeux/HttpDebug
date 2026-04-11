import { useAppStore } from '../store';
import { METHOD_COLORS } from '../types';

export default function TabBar() {
  const { tabs, activeTabId, setActiveTab, addTab, closeTab } = useAppStore();

  return (
    <div className="flex items-center bg-surface-900 border-b border-surface-700 overflow-x-auto">
      <div className="flex items-center min-w-0 flex-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const method = tab.request.method;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group relative flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-surface-700
                min-w-[120px] max-w-[200px] transition-colors flex-shrink-0
                ${isActive
                  ? 'bg-surface-800 text-surface-100 border-b-2 border-b-blue-500'
                  : 'bg-surface-900 text-surface-400 hover:bg-surface-800 hover:text-surface-200 border-b-2 border-b-transparent'
                }`}
            >
              <span className={`font-bold text-[10px] ${METHOD_COLORS[method]}`}>
                {method}
              </span>
              <span className="truncate flex-1 text-left">{tab.name}</span>
              {tab.isLoading && (
                <svg className="animate-spin h-3 w-3 text-blue-400 flex-shrink-0" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="ml-1 p-0.5 rounded hover:bg-surface-600 text-surface-500 hover:text-surface-200
                  opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </span>
            </button>
          );
        })}
      </div>
      <button
        onClick={addTab}
        className="p-1.5 mx-1 rounded hover:bg-surface-700 text-surface-400 hover:text-surface-100 flex-shrink-0"
        title="New tab"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}
