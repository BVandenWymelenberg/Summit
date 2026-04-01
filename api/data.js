import { put, list, del } from '@vercel/blob';

const BLOB_KEY = 'summit-data.json';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { blobs } = await list({ prefix: BLOB_KEY });
      if (blobs.length === 0) {
        return res.status(200).json(null);
      }
      const response = await fetch(blobs[0].url);
      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      console.error('GET error:', err);
      return res.status(200).json(null);
    }
  }

  if (req.method === 'PUT') {
    try {
      // Delete old blob first
      const { blobs } = await list({ prefix: BLOB_KEY });
      if (blobs.length > 0) {
        await del(blobs.map(b => b.url));
      }
      // Write new blob
      await put(BLOB_KEY, JSON.stringify(req.body), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
      });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('PUT error:', err);
      return res.status(500).json({ error: 'Failed to save data' });
    }
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
}
