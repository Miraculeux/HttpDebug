import { Router } from 'express';
import { loadHistory, addToHistory, clearHistory, deleteHistoryEntry } from './storage.js';

const router = Router();

// Get all history
router.get('/', async (_req, res) => {
  try {
    const history = await loadHistory();
    res.json(history);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Add a history entry
router.post('/', async (req, res) => {
  try {
    const entry = req.body;
    if (!entry || !entry.id) {
      res.status(400).json({ error: 'Invalid history entry' });
      return;
    }
    await addToHistory(entry);
    res.status(201).json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Clear all history
router.delete('/', async (_req, res) => {
  try {
    await clearHistory();
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Delete a single history entry
router.delete('/:id', async (req, res) => {
  try {
    await deleteHistoryEntry(req.params.id);
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
