export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS'
  | 'TRACE';

export type AuthType = 'none' | 'basic' | 'bearer' | 'api-key' | 'oauth2' | 'digest';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface BasicAuth {
  username: string;
  password: string;
}

export interface BearerAuth {
  token: string;
  prefix: string;
}

export interface ApiKeyAuth {
  key: string;
  value: string;
  addTo: 'header' | 'query';
}

export interface OAuth2Auth {
  grantType: 'authorization_code' | 'client_credentials' | 'password';
  accessTokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  token: string;
}

export interface DigestAuth {
  username: string;
  password: string;
}

export interface AuthConfig {
  type: AuthType;
  basic: BasicAuth;
  bearer: BearerAuth;
  apiKey: ApiKeyAuth;
  oauth2: OAuth2Auth;
  digest: DigestAuth;
}

export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary';

export interface RequestBody {
  type: BodyType;
  content: string;
  formData: KeyValuePair[];
}

export interface HttpRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: RequestBody;
  auth: AuthConfig;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
}

export interface SavedRequest {
  id: string;
  request: HttpRequest;
  response?: HttpResponse;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  requests: SavedRequest[];
  createdAt: string;
  updatedAt: string;
}

export interface HistoryEntry {
  id: string;
  request: HttpRequest;
  response: HttpResponse;
  timestamp: string;
}

export interface RequestTab {
  id: string;
  request: HttpRequest;
  response: HttpResponse | null;
  isLoading: boolean;
  error: string | null;
  name: string;
}

export function createTab(): RequestTab {
  const req = createEmptyRequest();
  return {
    id: req.id,
    request: req,
    response: null,
    isLoading: false,
    error: null,
    name: 'New Request',
  };
}

export interface AppSettings {
  collectionStoragePath: string;
  defaultHeaders: KeyValuePair[];
  timeout: number;
  followRedirects: boolean;
  validateSSL: boolean;
}

export const DEFAULT_AUTH: AuthConfig = {
  type: 'none',
  basic: { username: '', password: '' },
  bearer: { token: '', prefix: 'Bearer' },
  apiKey: { key: '', value: '', addTo: 'header' },
  oauth2: {
    grantType: 'client_credentials',
    accessTokenUrl: '',
    clientId: '',
    clientSecret: '',
    scope: '',
    token: '',
  },
  digest: { username: '', password: '' },
};

export const DEFAULT_BODY: RequestBody = {
  type: 'none',
  content: '',
  formData: [],
};

export function createEmptyRequest(): HttpRequest {
  return {
    id: crypto.randomUUID(),
    name: 'New Request',
    method: 'GET',
    url: '',
    headers: [],
    params: [],
    body: { ...DEFAULT_BODY, formData: [] },
    auth: { ...DEFAULT_AUTH },
  };
}

export const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'text-green-400',
  POST: 'text-yellow-400',
  PUT: 'text-blue-400',
  PATCH: 'text-purple-400',
  DELETE: 'text-red-400',
  HEAD: 'text-cyan-400',
  OPTIONS: 'text-pink-400',
  TRACE: 'text-orange-400',
};
