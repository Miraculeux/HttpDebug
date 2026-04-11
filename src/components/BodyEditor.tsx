import { useCallback, useRef, useMemo } from 'react';
import { useAppStore } from '../store';
import type { BodyType } from '../types';
import KeyValueEditor from './KeyValueEditor';

const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'raw', label: 'Raw' },
  { value: 'form-data', label: 'Form Data' },
  { value: 'x-www-form-urlencoded', label: 'URL Encoded' },
];

function highlightJson(text: string): (JSX.Element | string)[] {
  const parts: (JSX.Element | string)[] = [];
  // Regex to match JSON tokens: strings, numbers, booleans, null, braces/brackets, colons, commas
  const tokenRegex = /("(?:[^"\\]|\\.)*")\s*(:)|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|(true|false|null)\b|([{}[\]:,])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    // Add any text between tokens (whitespace)
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      // Key (string followed by colon)
      parts.push(<span key={i++} className="text-blue-400">{match[1]}</span>);
      parts.push(<span key={i++} className="text-surface-400">{match[2]}</span>);
    } else if (match[3] !== undefined) {
      // String value
      parts.push(<span key={i++} className="text-green-400">{match[3]}</span>);
    } else if (match[4] !== undefined) {
      // Number
      parts.push(<span key={i++} className="text-purple-400">{match[4]}</span>);
    } else if (match[5] !== undefined) {
      // Boolean / null
      parts.push(<span key={i++} className="text-orange-400">{match[5]}</span>);
    } else if (match[6] !== undefined) {
      // Structural chars
      parts.push(<span key={i++} className="text-surface-400">{match[6]}</span>);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export default function BodyEditor() {
  const { currentRequest, setCurrentRequest } = useAppStore();
  const body = currentRequest.body;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
      e.preventDefault();
      e.stopPropagation();
      textareaRef.current?.select();
    }
    // Tab key inserts 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      if (ta) {
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const val = ta.value;
        const newVal = val.substring(0, start) + '  ' + val.substring(end);
        updateBody({ content: newVal });
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 2;
        });
      }
    }
  }, [body]);

  const highlighted = useMemo(() => {
    if (body.type === 'json' && body.content) {
      return highlightJson(body.content);
    }
    return null;
  }, [body.type, body.content]);

  const handleScroll = useCallback(() => {
    const ta = textareaRef.current;
    const pre = preRef.current;
    if (ta && pre) {
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
    }
  }, []);

  const updateBody = (updates: Partial<typeof body>) => {
    setCurrentRequest({ body: { ...body, ...updates } });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3">
      <div className="flex gap-1 flex-wrap">
        {BODY_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => updateBody({ type: t.value })}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              body.type === t.value
                ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                : 'border-surface-600 text-surface-400 hover:border-surface-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {body.type === 'none' && (
        <p className="text-sm text-surface-500 italic">
          This request does not have a body.
        </p>
      )}

      {body.type === 'json' && (
        <div className="relative flex-1 min-h-[200px] rounded border border-surface-600 bg-surface-800
          focus-within:border-blue-500 overflow-hidden">
          <pre
            ref={preRef}
            aria-hidden="true"
            className="absolute inset-0 px-3 py-2 text-sm font-mono whitespace-pre-wrap break-words
              overflow-hidden pointer-events-none"
          >
            {highlighted || <span className="text-surface-500">{`{\n  "key": "value"\n}`}</span>}
            {/* Extra newline so pre matches textarea scroll height */}
            {'\n'}
          </pre>
          <textarea
            ref={textareaRef}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            value={body.content}
            onChange={(e) => updateBody({ content: e.target.value })}
            placeholder={'{\n  "key": "value"\n}'}
            spellCheck={false}
            className="relative w-full h-full min-h-[200px] bg-transparent px-3 py-2 text-sm
              font-mono text-transparent caret-surface-100 placeholder-surface-500
              focus:outline-none resize-none"
            style={{ caretColor: '#e2e8f0' }}
          />
        </div>
      )}

      {body.type === 'raw' && (
        <textarea
          ref={textareaRef}
          onKeyDown={handleKeyDown}
          value={body.content}
          onChange={(e) => updateBody({ content: e.target.value })}
          placeholder="Raw content..."
          className="w-full flex-1 min-h-[200px] bg-surface-800 border border-surface-600 rounded px-3 py-2 text-sm
            font-mono text-surface-100 placeholder-surface-500 focus:outline-none focus:border-blue-500 resize-none"
        />
      )}

      {(body.type === 'form-data' || body.type === 'x-www-form-urlencoded') && (
        <KeyValueEditor
          items={body.formData}
          onChange={(formData) => updateBody({ formData })}
          keyPlaceholder="Field name"
          valuePlaceholder="Field value"
        />
      )}
    </div>
  );
}
