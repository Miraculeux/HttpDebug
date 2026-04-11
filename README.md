# HttpDebug

A full-featured HTTP debugging tool with a modern dark-themed UI. Send requests, inspect responses, organize collections, and track history — all from a native macOS app or the browser.

## Features

- **All HTTP methods** — GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS, TRACE
- **Authentication** — Basic, Bearer, API Key, OAuth2, Digest
- **Request body** — JSON, Raw, Form Data, URL Encoded
- **Collections** — Save, organize, import, and export request collections
- **Request history** — Automatically saved with full request/response data
- **JSON viewer** — Syntax-highlighted with collapsible tree levels
- **Configurable** — Storage path, timeout, SSL validation, default headers
- **Native macOS app** — SwiftUI wrapper with embedded WebView; auto-starts the server

## Quick Start

### Browser (Development)

```bash
npm install
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173). The backend runs on port 3001.

### Browser (Production)

```bash
npm run build
npm start
```

Server serves the frontend at [http://localhost:3001](http://localhost:3001).

### macOS App

Requires Xcode and Node.js installed.

```bash
npm install
npm run build
cd macApp
xcodebuild -project HttpDebug.xcodeproj -scheme HttpDebug -configuration Release build
```

The built app is in `~/Library/Developer/Xcode/DerivedData/HttpDebug-*/Build/Products/Release/HttpDebug.app`. Copy it to `/Applications` to install.

The app automatically starts and stops the Node.js server on launch and quit.

## Project Structure

```
HttpDebug/
├── src/                  # React frontend (TypeScript)
│   ├── components/       # UI components
│   ├── api.ts            # Frontend API client
│   ├── store.ts          # Zustand state management
│   └── types.ts          # Shared type definitions
├── server/               # Express backend (TypeScript)
│   ├── index.ts          # Server entry point
│   ├── proxy.ts          # HTTP proxy handler
│   ├── collections.ts    # Collections CRUD API
│   ├── history.ts        # Request history API
│   ├── settings.ts       # Settings API
│   └── storage.ts        # File-based persistence
├── macApp/               # Native macOS app (SwiftUI)
│   ├── HttpDebugApp/     # Swift source files
│   └── HttpDebug.xcodeproj
├── dist/                 # Built frontend (generated)
└── .httpdebug/           # Data storage (collections, history, settings)
```

## Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | React 18, TypeScript, Tailwind CSS  |
| State    | Zustand                             |
| Backend  | Express, Axios, Node.js             |
| Build    | Vite, tsc                           |
| macOS    | SwiftUI, WKWebView, Xcode           |

## Data Storage

Collections, history, and settings are stored as JSON files in the `.httpdebug/` directory (configurable in Settings). History retains the last 500 requests automatically.

## License

MIT
