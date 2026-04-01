import { put, get } from '@vercel/blob';
import { Readable } from 'node:stream';
import { verifyToken } from './auth.js';

const BLOB_PATH = 'summit-data.json';

export default async function handler(req, res) {
  if (!verifyToken(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.method === 'GET') {
    try {
      const result = await get(BLOB_PATH, { access: 'private' });
      if (!result || result.statusCode !== 200) {
        return res.status(200).json(null);
      }
      res.setHeader('Content-Type', 'application/json');
      Readable.fromWeb(result.stream).pipe(res);
    } catch (err) {
      // Blob doesn't exist yet — return null so frontend uses defaults
      return res.status(200).json(null);
    }
  } else if (req.method === 'PUT') {
    try {
      await put(BLOB_PATH, JSON.stringify(req.body), {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('PUT error:', err);
      return res.status(500).json({ error: 'Failed to save data' });
    }
  } else {
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
