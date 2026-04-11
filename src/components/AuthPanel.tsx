import { useAppStore } from '../store';
import type { AuthConfig, AuthType } from '../types';

const AUTH_TYPES: { value: AuthType; label: string }[] = [
  { value: 'none', label: 'No Auth' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api-key', label: 'API Key' },
  { value: 'oauth2', label: 'OAuth 2.0' },
  { value: 'digest', label: 'Digest Auth' },
];

export default function AuthPanel() {
  const { currentRequest, setCurrentRequest } = useAppStore();
  const auth = currentRequest.auth;

  const updateAuth = (updates: Partial<AuthConfig>) => {
    setCurrentRequest({ auth: { ...auth, ...updates } });
  };

  return (
    <div className="space-y-3">
      <select
        value={auth.type}
        onChange={(e) => updateAuth({ type: e.target.value as AuthType })}
        className="w-full bg-surface-800 border border-surface-600 rounded px-3 py-1.5 text-sm
          text-surface-100 focus:outline-none focus:border-blue-500"
      >
        {AUTH_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      {auth.type === 'basic' && (
        <div className="space-y-2">
          <input
            type="text"
            value={auth.basic.username}
            onChange={(e) =>
              updateAuth({ basic: { ...auth.basic, username: e.target.value } })
            }
            placeholder="Username"
            className="w-full bg-surface-800 border border-surface-600 rounded px-3 py-1.5 text-sm
              text-surface-100 placeholder-surface-500 focus:outline-none focus:border-blue-500"
          />
          <input
            type="password"
            value={auth.basic.password}
            onChange={(e) =>
              updateAuth({ basic: { ...auth.basic, password: e.target.value } })
            }
            placeholder="Password"
            className="w-full bg-surface-800 border border-surface-600 rounded px-3 py-1.5 text-sm
              text-surface-100 placeholder-surface-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      )}

      {auth.type === 'bearer' && (
        <div className="space-y-2">
          <input
            type="text"
            value={auth.bearer.prefix}
            onChange={(e) =>
              updateAuth({ bearer: { ...auth.bearer, prefix: e.target.value } })
            }
            placeholder="Prefix (e.g., Bearer)"
            className="w-full bg-surface-800 border border-surface-600 rounded px-3 py-1.5 text-sm
              text-surface-100 placeholder-surface-500 focus:outline-none focus:border-blue-500"
          />
          <textarea
            value={auth.bearer.token}
            onChange={(e) =>
              updateAuth({ bearer: { ...auth.bearer, token: e.target.value } })
            }
            placeholder="Token"
            rows={3}
            className="w-full bg-surface-800 border border-surface-600 rounded px-3 py-1.5 text-sm
              text-surface-100 placeholder-surface-500 focus:outline-none focus:border-blue-500 resize-none font-mono"
          />
        </div>
      )}

      {auth.type === 'api-key' && (
        <div className="space-y-2">
          <select
            value={auth.apiKey.addTo}
            onChange={(e) =>
              updateAuth({
                apiKey: { ...auth.apiKey, addTo: e.target.value as 'header' | 'query' },
              })
            }
            className="w-full bg-surface-800 border border-surface-600 rounded px-3 py-1.5 text-sm
              text-surface-100 focus:outline-none focus:border-blue-500"
          >
            <option value="header">Header</option>
            <option value="query">Query Param</option>
          </select>
          <input
            type="text"
            value={auth.apiKey.key}
            onChange={(e) =>
              updateAuth({ apiKey: { ...auth.apiKey, key: e.target.value } })
            }
            placeholder="Key name (e.g., X-API-Key)"
            className="w-full bg-surface-800 border border-surface-600 rounded px-3 py-1.5 text-sm
              text-surface-100 placeholder-surface-500 focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            value={auth.apiKey.value}
            onChange={(e) =>
              updateAuth({ apiKey: { ...auth.apiKey, value: e.target.value } })
            }
            placeholder="Value"
            className="w-full bg-surface-800 border border-surface-600 rounded px-3 py-1.5 text-sm
              text-surface-100 placeholder-surface-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      )}

      {auth.type === 'oauth2' && (
        <div className="space-y-2">
          <select
            value={auth.oauth2.grantType}
            onChange={(e) =>
              updateAuth({
                oauth2: {
                  ...auth.oauth2,
                  grantType: e.target.value as 'authorization_code' | 'client_credentials' | 'password',
                },
              })
            }
            className="w-full bg-surface-800 border border-surface-600 rounded px-3 py-1.5 text-sm
              text-surface-100 focus:outline-none focus:border-blue-500"
          >
            <option value="client_credentials">Client Credentials</option>
            <option value="authorization_code">Authorization Code</option>
            <option value="password">Password</option>
          </select>
          <input
            type="text"
            value={auth.oauth2.accessTokenUrl}
            onChange={(e) =>
              updateAuth({ oauth2: { ...auth.oauth2, accessTokenUrl: e.target.value } })
            }
            placeholder="Access Token URL"
            className="w-full bg-surface-800 border border-surface-600 rounded px-3 py-1.5 text-sm
              text-surface-100 placeholder-surface-500 focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            value={auth.oauth2.clientId}
            onChange={(e) =>
              updateAuth({ oauth2: { ...auth.oauth2, clientId: e.target.value } })
            }
            placeholder="Client ID"
            className="w-full bg-surface-800 border border-surface-600 rounded px-3 py-1.5 text-sm
              text-surface-100 placeholder-surface-500 focus:outline-none focus:border-blue-500"
          />
          <input
            type="password"
            value={auth.oauth2.clientSecret}
            onChange={(e) =>
              updateAuth({ oauth2: { ...auth.oauth2, clientSecret: e.target.value } })
            }
            placeholder="Client Secret"
            className="w-full bg-surface-800 border border-surface-600 rounded px-3 py-1.5 text-sm
              text-surface-100 placeholder-surface-500 focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            value={auth.oauth2.scope}
            onChange={(e) =>
              updateAuth({ oauth2: { ...auth.oauth2, scope: e.target.value } })
            }
            placeholder="Scope"
            className="w-full bg-surface-800 border border-surface-600 rounded px-3 py-1.5 text-sm
              text-surface-100 placeholder-surface-500 focus:outline-none focus:border-blue-500"
          />
          {auth.oauth2.token && (
            <div className="p-2 bg-surface-800 rounded border border-surface-600">
              <p className="text-xs text-surface-400 mb-1">Current Token:</p>
              <p className="text-xs font-mono text-green-400 break-all">{auth.oauth2.token}</p>
            </div>
          )}
        </div>
      )}

      {auth.type === 'digest' && (
        <div className="space-y-2">
          <input
            type="text"
            value={auth.digest.username}
            onChange={(e) =>
              updateAuth({ digest: { ...auth.digest, username: e.target.value } })
            }
            placeholder="Username"
            className="w-full bg-surface-800 border border-surface-600 rounded px-3 py-1.5 text-sm
              text-surface-100 placeholder-surface-500 focus:outline-none focus:border-blue-500"
          />
          <input
            type="password"
            value={auth.digest.password}
            onChange={(e) =>
              updateAuth({ digest: { ...auth.digest, password: e.target.value } })
            }
            placeholder="Password"
            className="w-full bg-surface-800 border border-surface-600 rounded px-3 py-1.5 text-sm
              text-surface-100 placeholder-surface-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      )}

      {auth.type === 'none' && (
        <p className="text-sm text-surface-500 italic">
          No authentication will be used for this request.
        </p>
      )}
    </div>
  );
}
