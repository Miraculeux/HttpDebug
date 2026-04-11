import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import proxyRouter from './proxy.js';
import collectionsRouter from './collections.js';
import settingsRouter from './settings.js';
import historyRouter from './history.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api/proxy', proxyRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/history', historyRouter);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`HttpDebug server running on http://localhost:${PORT}`);
});
