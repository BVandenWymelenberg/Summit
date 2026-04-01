import { put, get, del, list } from '@vercel/blob';
import { verifyToken } from './auth.js';

const PREFIX = 'tasks/';
const ARCHIVE_PREFIX = 'archived-tasks/';

function blobPath(id) { return `${PREFIX}${id}.json`; }
function archiveBlobPath(id) { return `${ARCHIVE_PREFIX}${id}.json`; }

export default async function handler(req, res) {
  if (!verifyToken(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { method } = req;
  const id = req.query.id;

  // GET /api/tasks — list all active tasks
  if (method === 'GET' && !id) {
    try {
      const { blobs } = await list({ prefix: PREFIX });
      const tasks = await Promise.all(
        blobs.map(async (b) => {
          try {
            const result = await get(b.pathname, { access: 'private' });
            if (result?.statusCode === 200) {
              const text = await new Response(result.stream).text();
              return JSON.parse(text);
            }
          } catch { return null; }
          return null;
        })
      );
      return res.status(200).json(tasks.filter(Boolean));
    } catch (err) {
      console.error('List tasks error:', err);
      return res.status(200).json([]);
    }
  }

  // GET /api/tasks?id=archived — list all archived tasks
  if (method === 'GET' && id === 'archived') {
    try {
      const { blobs } = await list({ prefix: ARCHIVE_PREFIX });
      const tasks = await Promise.all(
        blobs.map(async (b) => {
          try {
            const result = await get(b.pathname, { access: 'private' });
            if (result?.statusCode === 200) {
              const text = await new Response(result.stream).text();
              return JSON.parse(text);
            }
          } catch { return null; }
          return null;
        })
      );
      return res.status(200).json(tasks.filter(Boolean));
    } catch (err) {
      console.error('List archived tasks error:', err);
      return res.status(200).json([]);
    }
  }

  // POST /api/tasks — create a new task
  if (method === 'POST') {
    try {
      const task = req.body;
      await put(blobPath(task.id), JSON.stringify(task), {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
      });
      return res.status(201).json(task);
    } catch (err) {
      console.error('Create task error:', err);
      return res.status(500).json({ error: 'Failed to create task' });
    }
  }

  // PUT /api/tasks?id=123 — update a task
  if (method === 'PUT' && id) {
    try {
      const task = req.body;
      await put(blobPath(id), JSON.stringify(task), {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      return res.status(200).json(task);
    } catch (err) {
      console.error('Update task error:', err);
      return res.status(500).json({ error: 'Failed to update task' });
    }
  }

  // DELETE /api/tasks?id=123&archive=true — archive a task
  if (method === 'DELETE' && id) {
    try {
      const archive = req.query.archive === 'true';
      if (archive) {
        // Read the task first, then move to archive
        try {
          const result = await get(blobPath(id), { access: 'private' });
          if (result?.statusCode === 200) {
            const text = await new Response(result.stream).text();
            const task = JSON.parse(text);
            task.archivedAt = new Date().toISOString();
            await put(archiveBlobPath(id), JSON.stringify(task), {
              access: 'private',
              contentType: 'application/json',
              addRandomSuffix: false,
            });
          }
        } catch { /* task may not exist, that's ok */ }
      }
      // Delete from active tasks
      const { blobs } = await list({ prefix: blobPath(id) });
      if (blobs.length > 0) {
        await del(blobs.map(b => b.url));
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Delete task error:', err);
      return res.status(500).json({ error: 'Failed to delete task' });
    }
  }

  res.setHeader('Allow', 'GET, POST, PUT, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
