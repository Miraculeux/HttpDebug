import { useState } from 'react';
import { useAppStore } from '../store';
import KeyValueEditor from './KeyValueEditor';
import AuthPanel from './AuthPanel';
import BodyEditor from './BodyEditor';

type Tab = 'params' | 'headers' | 'body' | 'auth';

export default function RequestBuilder() {
  const {
    currentRequest,
    setCurrentRequest,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<Tab>('params');

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'params', label: 'Params', count: currentRequest.params.filter((p) => p.enabled).length },
    { key: 'headers', label: 'Headers', count: currentRequest.headers.filter((h) => h.enabled).length },
    { key: 'body', label: 'Body' },
    { key: 'auth', label: 'Auth' },
  ];

  return (
    <div className="flex flex-col h-full">
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
