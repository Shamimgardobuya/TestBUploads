// server.js
//
// This is the ONLY place the Supabase anon key exists. It's read from
// an environment variable, never written into any file that ships to
// the browser. The browser calls POST /api/prepare-bike-import on
// THIS server (same origin, no key needed on that request); this
// server then calls the Supabase Edge Function with the real key
// attached server-side.
//
// Run locally:
//   npm install
//   cp .env.example .env   (then fill in the two values)
//   npm start
//
// The frontend is served from /public, so the whole thing is one app.

require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const EDGE_FUNCTION_URL = process.env.EDGE_FUNCTION_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!EDGE_FUNCTION_URL || !SUPABASE_ANON_KEY) {
  console.warn('WARNING: EDGE_FUNCTION_URL and/or SUPABASE_ANON_KEY are not set. Set them in .env.');
}

app.post('/api/prepare-bike-import', async (req, res) => {
  const { rows, filename } = req.body || {};

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'rows must be a non-empty array' });
  }
  if (typeof filename !== 'string' || filename.length === 0) {
    return res.status(400).json({ error: 'filename is required' });
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

    res.json(payload);
  } catch (err) {
    console.error('Error calling Edge Function:', err);
    res.status(502).json({ error: 'Failed to reach the bike-check service' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bike import app listening on port ${PORT}`);
});
