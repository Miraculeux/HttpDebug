import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '../store';

type Tab = 'body' | 'headers';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function statusColor(status: number): string {
  if (status < 200) return 'text-blue-400';
  if (status < 300) return 'text-green-400';
  if (status < 400) return 'text-yellow-400';
  if (status < 500) return 'text-orange-400';
  return 'text-red-400';
}

function statusBgColor(status: number): string {
  if (status < 200) return 'bg-blue-500/10 border-blue-500/30';
  if (status < 300) return 'bg-green-500/10 border-green-500/30';
  if (status < 400) return 'bg-yellow-500/10 border-yellow-500/30';
  if (status < 500) return 'bg-orange-500/10 border-orange-500/30';
  return 'bg-red-500/10 border-red-500/30';
}

function tryParseJson(raw: string): { parsed: unknown; isJson: boolean } {
  try {
    return { parsed: JSON.parse(raw), isJson: true };
  } catch {
    return { parsed: null, isJson: false };
  }
}

function JsonValue({ value, indent = 0, path = '' }: { value: unknown; indent?: number; path?: string }) {
  const [collapsed, setCollapsed] = useState(false);

  if (value === null) return <span className="text-orange-400 italic">null</span>;
  if (typeof value === 'boolean')
    return <span className="text-orange-400">{value ? 'true' : 'false'}</span>;
  if (typeof value === 'number')
    return <span className="text-purple-400">{String(value)}</span>;
  if (typeof value === 'string')
    return <span className="text-green-400">&quot;{value}&quot;</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-surface-400">{'[]'}</span>;
    const pad = '  '.repeat(indent);
    const innerPad = '  '.repeat(indent + 1);

    const toggle = (
      <span
        onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
        className="cursor-pointer select-none inline-block w-3 text-surface-500 hover:text-surface-200"
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed ? '▸' : '▾'}
      </span>
    );

    if (collapsed) {
      return (
        <span>
          {toggle}{'['}
          <span className="text-surface-500 italic"> {value.length} items </span>
          {']'}
        </span>
      );
    }

    return (
      <span>
        {toggle}{'['}
        {value.map((item, i) => (
          <span key={i}>
            {'\n' + innerPad}
            <JsonValue value={item} indent={indent + 1} path={`${path}[${i}]`} />
            {i < value.length - 1 ? ',' : ''}
          </span>
        ))}
        {'\n' + pad + ']'}
      </span>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-surface-400">{'{}'}</span>;
    const pad = '  '.repeat(indent);
    const innerPad = '  '.repeat(indent + 1);

    const toggle = (
      <span
        onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
        className="cursor-pointer select-none inline-block w-3 text-surface-500 hover:text-surface-200"
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed ? '▸' : '▾'}
      </span>
    );

    if (collapsed) {
      return (
        <span>
          {toggle}{'{'}
          <span className="text-surface-500 italic"> {entries.length} keys </span>
          {'}'}
        </span>
      );
    }

    return (
      <span>
        {toggle}{'{'}
        {entries.map(([key, val], i) => (
          <span key={key}>
            {'\n' + innerPad}
            <span className="text-blue-400">&quot;{key}&quot;</span>
            <span className="text-surface-400">: </span>
            <JsonValue value={val} indent={indent + 1} path={`${path}.${key}`} />
            {i < entries.length - 1 ? ',' : ''}
          </span>
        ))}
        {'\n' + pad + '}'}
      </span>
    );
  }

  return <span className="text-surface-300">{String(value)}</span>;
}

export default function ResponseViewer() {
  const { currentResponse, isLoading } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('body');
  const [wordWrap, setWordWrap] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
      e.preventDefault();
      e.stopPropagation();
      const sel = window.getSelection();
      if (sel && containerRef.current) {
        const range = document.createRange();
        range.selectNodeContents(containerRef.current);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg
            className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-3"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-surface-400 text-sm">Sending request...</p>
        </div>
      </div>
    );
  }

  if (!currentResponse) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-surface-500">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="mx-auto mb-3 opacity-40"
          >
            <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
            <polyline points="13 2 13 9 20 9" />
          </svg>
          <p className="text-sm">Send a request to see the response</p>
        </div>
      </div>
    );
  }

  const { parsed, isJson } = tryParseJson(currentResponse.body);
  const headerEntries = Object.entries(currentResponse.headers);

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="flex items-center gap-3 p-3 border-b border-surface-700">
        <span
          className={`px-2.5 py-1 rounded border text-sm font-bold ${statusBgColor(currentResponse.status)} ${statusColor(currentResponse.status)}`}
        >
          {currentResponse.status} {currentResponse.statusText}
        </span>
        <span className="text-xs text-surface-400">
          {formatTime(currentResponse.time)}
        </span>
        <span className="text-xs text-surface-400">
          {formatBytes(currentResponse.size)}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => navigator.clipboard.writeText(currentResponse.body)}
          className="text-xs text-surface-400 hover:text-surface-200 px-2 py-1 rounded hover:bg-surface-700"
        >
          Copy body
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-surface-700">
        <button
          onClick={() => setActiveTab('body')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'body'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-surface-400 hover:text-surface-200'
          }`}
        >
          Body
        </button>
        <button
          onClick={() => setActiveTab('headers')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'headers'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-surface-400 hover:text-surface-200'
          }`}
        >
          Headers
          <span className="ml-1.5 px-1.5 py-0.5 bg-surface-700 rounded-full text-xs">
            {headerEntries.length}
          </span>
        </button>
        <div className="flex-1" />
        {activeTab === 'body' && (
          <button
            onClick={() => setWordWrap(!wordWrap)}
            className={`mr-3 text-xs px-2 py-1 rounded ${
              wordWrap
                ? 'text-blue-400 bg-blue-500/10'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            Wrap
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3" ref={containerRef} onKeyDown={handleKeyDown} tabIndex={-1}>
        {activeTab === 'body' && (
          <pre
            className={`json-viewer text-surface-200 ${
              wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'
            }`}
          >
            {isJson ? <JsonValue value={parsed} /> : currentResponse.body}
          </pre>
        )}

        {activeTab === 'headers' && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-surface-400 border-b border-surface-700">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {headerEntries.map(([key, value]) => (
                <tr
                  key={key}
                  className="border-b border-surface-800 hover:bg-surface-800/50"
                >
                  <td className="py-1.5 pr-4 font-mono text-blue-400 text-xs">
                    {key}
                  </td>
                  <td className="py-1.5 font-mono text-surface-300 text-xs break-all">
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
