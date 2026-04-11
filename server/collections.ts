import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  listCollections,
  getCollection,
  saveCollection,
  deleteCollection,
} from './storage.js';

const router = Router();

// List all collections
router.get('/', async (_req, res) => {
  try {
    const collections = await listCollections();
    res.json(collections);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get a single collection
router.get('/:id', async (req, res) => {
  try {
    const collection = await getCollection(req.params.id);
    res.json(collection);
  } catch {
    res.status(404).json({ error: 'Collection not found' });
  }
});

// Create a new collection
router.post('/', async (req, res) => {
  try {
    const { name, description = '' } = req.body;
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    const collection = {
      id: uuidv4(),
      name: name.trim(),
      description: (description || '').trim(),
      requests: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveCollection(collection);
    res.status(201).json(collection);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Update a collection
router.put('/:id', async (req, res) => {
  try {
    const existing = await getCollection(req.params.id);
    const { name, description } = req.body;
    if (name !== undefined) existing.name = String(name).trim();
    if (description !== undefined) existing.description = String(description).trim();
    existing.updatedAt = new Date().toISOString();
    await saveCollection(existing);
    res.json(existing);
  } catch {
    res.status(404).json({ error: 'Collection not found' });
  }
});

// Delete a collection
router.delete('/:id', async (req, res) => {
  try {
    await deleteCollection(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Collection not found' });
  }
});

// Add a request to a collection
router.post('/:id/requests', async (req, res) => {
  try {
    const collection = await getCollection(req.params.id);
    const { request, response } = req.body;
    const savedRequest = {
      id: uuidv4(),
      request,
      response: response || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    collection.requests.push(savedRequest);
    collection.updatedAt = new Date().toISOString();
    await saveCollection(collection);
    res.status(201).json(savedRequest);
  } catch {
    res.status(404).json({ error: 'Collection not found' });
  }
});

// Update a request in a collection
router.put('/:id/requests/:requestId', async (req, res) => {
  try {
    const collection = await getCollection(req.params.id);
    const idx = collection.requests.findIndex(
      (r: { id: string }) => r.id === req.params.requestId
    );
    if (idx === -1) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    const { request, response } = req.body;
    if (request) collection.requests[idx].request = request;
    if (response !== undefined) collection.requests[idx].response = response;
    collection.requests[idx].updatedAt = new Date().toISOString();
    collection.updatedAt = new Date().toISOString();
    await saveCollection(collection);
    res.json(collection.requests[idx]);
  } catch {
    res.status(404).json({ error: 'Collection not found' });
  }
});

// Delete a request from a collection
router.delete('/:id/requests/:requestId', async (req, res) => {
  try {
    const collection = await getCollection(req.params.id);
    const idx = collection.requests.findIndex(
      (r: { id: string }) => r.id === req.params.requestId
    );
    if (idx === -1) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    collection.requests.splice(idx, 1);
    collection.updatedAt = new Date().toISOString();
    await saveCollection(collection);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Collection not found' });
  }
});

// Export a collection
router.get('/:id/export', async (req, res) => {
  try {
    const collection = await getCollection(req.params.id);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${collection.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json"`
    );
    res.json(collection);
  } catch {
    res.status(404).json({ error: 'Collection not found' });
  }
});

// Import a collection
router.post('/import', async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.name || !Array.isArray(data.requests)) {
      res.status(400).json({ error: 'Invalid collection format' });
      return;
    }
    const collection = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveCollection(collection);
    res.status(201).json(collection);
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
