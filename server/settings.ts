import { Router } from 'express';
import { loadSettings, saveSettings } from './storage.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const settings = await loadSettings();
    res.json(settings);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put('/', async (req, res) => {
  try {
    const current = await loadSettings();
    const updated = { ...current, ...req.body };
    const saved = await saveSettings(updated);
    res.json(saved);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
