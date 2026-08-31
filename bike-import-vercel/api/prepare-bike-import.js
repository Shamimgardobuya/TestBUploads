// api/prepare-bike-import.js
//
// Vercel automatically treats every file in /api as a serverless
// function, routed by filename: this one becomes
// POST /api/prepare-bike-import — no server.js, no app.listen(),
// no separate deployment step needed.
//
// The Supabase anon key is read from process.env, which you set in
// Vercel's dashboard (Project -> Settings -> Environment Variables),
// never written into any file here. It never reaches the browser.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { rows, filename } = req.body || {};

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'rows must be a non-empty array' });
  }
  if (typeof filename !== 'string' || filename.length === 0) {
    return res.status(400).json({ error: 'filename is required' });
  }

  const EDGE_FUNCTION_URL = process.env.EDGE_FUNCTION_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!EDGE_FUNCTION_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing EDGE_FUNCTION_URL or SUPABASE_ANON_KEY env vars');
    return res.status(500).json({ error: 'Server is misconfigured' });
  }

  try {
    const supabaseRes = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ rows, filename }),
    });

    const payload = await supabaseRes.json();

    if (!supabaseRes.ok) {
      return res.status(supabaseRes.status).json(payload);
    }

    return res.status(200).json(payload);
  } catch (err) {
    console.error('Error calling Edge Function:', err);
    return res.status(502).json({ error: 'Failed to reach the bike-check service' });
  }
}
