import type {
  HttpRequest,
  HttpResponse,
  Collection,
  AppSettings,
  SavedRequest,
  HistoryEntry,
} from './types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// Proxy
export async function sendRequest(
  req: HttpRequest,
  settings: AppSettings
): Promise<HttpResponse> {
  const headers: Record<string, string> = {};
  for (const h of req.headers) {
    if (h.enabled && h.key) headers[h.key] = h.value;
  }
  for (const h of settings.defaultHeaders) {
    if (h.enabled && h.key && !headers[h.key]) headers[h.key] = h.value;
  }

  let url = req.url;
  const enabledParams = req.params.filter((p) => p.enabled && p.key);
  if (enabledParams.length > 0) {
    const qs = new URLSearchParams();
    for (const p of enabledParams) qs.append(p.key, p.value);

    // Handle API key as query param
    if (req.auth.type === 'api-key' && req.auth.apiKey.addTo === 'query') {
      qs.append(req.auth.apiKey.key, req.auth.apiKey.value);
    }

    url += (url.includes('?') ? '&' : '?') + qs.toString();
  } else if (req.auth.type === 'api-key' && req.auth.apiKey.addTo === 'query') {
    const qs = new URLSearchParams();
    qs.append(req.auth.apiKey.key, req.auth.apiKey.value);
    url += (url.includes('?') ? '&' : '?') + qs.toString();
  }

  let body: string | undefined;
  if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(req.method)) {
    switch (req.body.type) {
      case 'json':
      case 'raw':
        body = req.body.content;
        break;
      case 'x-www-form-urlencoded': {
        const formParams = new URLSearchParams();
        for (const f of req.body.formData) {
          if (f.enabled && f.key) formParams.append(f.key, f.value);
        }
        body = formParams.toString();
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
        break;
      }
      case 'form-data': {
        // For form-data, we send as JSON and let server handle
        const formObj: Record<string, string> = {};
        for (const f of req.body.formData) {
          if (f.enabled && f.key) formObj[f.key] = f.value;
        }
        body = JSON.stringify(formObj);
        break;
      }
    }
  }

  return request<HttpResponse>('/proxy', {
    method: 'POST',
    body: JSON.stringify({
      method: req.method,
      url,
      headers,
      body,
      auth: req.auth,
      timeout: settings.timeout,
      followRedirects: settings.followRedirects,
      validateSSL: settings.validateSSL,
    }),
  });
}

// Collections
export const fetchCollections = () => request<Collection[]>('/collections');

export const fetchCollection = (id: string) =>
  request<Collection>(`/collections/${encodeURIComponent(id)}`);

export const createCollection = (name: string, description = '') =>
  request<Collection>('/collections', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });

export const updateCollection = (id: string, data: Partial<Collection>) =>
  request<Collection>(`/collections/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const removeCollection = (id: string) =>
  request<{ success: boolean }>(`/collections/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

export const addRequestToCollection = (
  collectionId: string,
  req: HttpRequest,
  resp?: HttpResponse
) =>
  request<SavedRequest>(`/collections/${encodeURIComponent(collectionId)}/requests`, {
    method: 'POST',
    body: JSON.stringify({ request: req, response: resp }),
  });

export const updateRequestInCollection = (
  collectionId: string,
  requestId: string,
  req: HttpRequest,
  resp?: HttpResponse
) =>
  request<SavedRequest>(
    `/collections/${encodeURIComponent(collectionId)}/requests/${encodeURIComponent(requestId)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ request: req, response: resp }),
    }
  );

export const deleteRequestFromCollection = (collectionId: string, requestId: string) =>
  request<{ success: boolean }>(
    `/collections/${encodeURIComponent(collectionId)}/requests/${encodeURIComponent(requestId)}`,
    { method: 'DELETE' }
  );

export const exportCollection = (id: string) =>
  request<Collection>(`/collections/${encodeURIComponent(id)}/export`);

export const importCollection = (data: unknown) =>
  request<Collection>('/collections/import', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Settings
export const fetchSettings = () => request<AppSettings>('/settings');

export const updateSettings = (settings: Partial<AppSettings>) =>
  request<AppSettings>('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });

// History
export const fetchHistory = () => request<HistoryEntry[]>('/history');

export const addHistoryEntry = (entry: HistoryEntry) =>
  request<{ success: boolean }>('/history', {
    method: 'POST',
    body: JSON.stringify(entry),
  });

export const clearHistory = () =>
  request<{ success: boolean }>('/history', { method: 'DELETE' });

export const deleteHistoryEntry = (id: string) =>
  request<{ success: boolean }>(`/history/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
