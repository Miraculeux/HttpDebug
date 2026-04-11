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

export default function BodyEditor() {
  const { currentRequest, setCurrentRequest } = useAppStore();
  const body = currentRequest.body;

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

      {(body.type === 'json' || body.type === 'raw') && (
        <textarea
          value={body.content}
          onChange={(e) => updateBody({ content: e.target.value })}
          placeholder={body.type === 'json' ? '{\n  "key": "value"\n}' : 'Raw content...'}
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
