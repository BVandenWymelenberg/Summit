import crypto from 'node:crypto';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body || {};
  const expected = process.env.SUMMIT_PASSWORD;

  if (!expected) {
    return res.status(500).json({ error: 'SUMMIT_PASSWORD not configured' });
  }

  if (!password || password !== expected) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  // Generate a session token (HMAC of password + date so it rotates daily)
  const today = new Date().toISOString().split('T')[0];
  const token = crypto.createHmac('sha256', expected).update(today).digest('hex');

  return res.status(200).json({ token });
}

// Shared helper for other API routes to verify the token
export function verifyToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return false;

  const token = auth.slice(7);
  const expected = process.env.SUMMIT_PASSWORD;
  if (!expected) return false;

  const today = new Date().toISOString().split('T')[0];
  const validToken = crypto.createHmac('sha256', expected).update(today).digest('hex');

  return token === validToken;
}
