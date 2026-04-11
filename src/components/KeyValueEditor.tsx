import { useState } from 'react';
import type { KeyValuePair } from '../types';

interface Props {
  items: KeyValuePair[];
  onChange: (items: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export default function KeyValueEditor({
  items,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}: Props) {
  const addItem = () => {
    onChange([
      ...items,
      { id: crypto.randomUUID(), key: '', value: '', enabled: true },
    ]);
  };

  const updateItem = (index: number, field: keyof KeyValuePair, value: string | boolean) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-1">
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center gap-1.5 group">
          <input
            type="checkbox"
            checked={item.enabled}
            onChange={(e) => updateItem(index, 'enabled', e.target.checked)}
            className="accent-blue-500 w-3.5 h-3.5 flex-shrink-0"
          />
          <input
            type="text"
            value={item.key}
            onChange={(e) => updateItem(index, 'key', e.target.value)}
            placeholder={keyPlaceholder}
            className="flex-1 bg-surface-800 border border-surface-600 rounded px-2 py-1 text-sm
              text-surface-100 placeholder-surface-500 focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            value={item.value}
            onChange={(e) => updateItem(index, 'value', e.target.value)}
            placeholder={valuePlaceholder}
            className="flex-1 bg-surface-800 border border-surface-600 rounded px-2 py-1 text-sm
              text-surface-100 placeholder-surface-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => removeItem(index)}
            className="p-1 text-surface-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        className="text-xs text-blue-400 hover:text-blue-300 mt-1"
      >
        + Add
      </button>
    </div>
  );
}
