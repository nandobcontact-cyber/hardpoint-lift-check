// Hardpoint Lift Check – AI-koppeling voor foto- en videoherkenning.
// Draait als serverfunctie op Vercel (map /api). De API-sleutel staat NIET in de app,
// maar als omgevingsvariabele in Vercel: Settings → Environment Variables.
//
//   ANTHROPIC_API_KEY  (verplicht)  je sleutel van platform.claude.com
//   ANTHROPIC_MODEL    (optioneel)  standaard claude-sonnet-5-5
//   ALLOWED_ORIGINS    (optioneel)  bijv. https://www.hardpointsafety.com,https://hardpointsafety.com
//
// De app stuurt: { prompt, images: [{ media_type, data (base64) }] }
// en krijgt terug: { json: { ... } }  of bij een fout: { code: "..." }

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const MAX_IMAGES = 6;
const MAX_IMAGE_B64 = 3_000_000; // ± 2,2 MB per beeld; de app verkleint beelden al naar 1280 px
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// eenvoudige rem tegen misbruik: max. aantal verzoeken per IP per minuut (per serverinstantie)
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 60_000, max = Number(process.env.RATE_PER_MINUTE || 12);
  const list = (hits.get(ip) || []).filter(t => now - t < win);
  list.push(now); hits.set(ip, list);
  return list.length > max;
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  if (typeof req.body === 'string') return Promise.resolve(JSON.parse(req.body || '{}'));
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', c => { d += c; if (d.length > 4_400_000) reject(new Error('too_large')); });
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function extractJson(text) {
  const t = String(text || '').replace(/```(?:json)?/g, '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const origin = req.headers.origin || '';
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (allowed.length && origin && !allowed.includes(origin)) return res.status(403).json({ code: 'forbidden' });

  // De app vraagt eerst met GET of de koppeling aan staat.
  if (req.method === 'GET') return res.status(200).json({ ok: !!process.env.ANTHROPIC_API_KEY, maxImages: MAX_IMAGES });
  if (req.method !== 'POST') return res.status(405).json({ code: 'method_not_allowed' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ code: 'not_configured' });

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  if (limited(ip)) return res.status(429).json({ code: 'rate_limited' });

  let body;
  try { body = await readBody(req); } catch (e) { return res.status(413).json({ code: 'image_rejected' }); }
  const prompt = typeof body.prompt === 'string' ? body.prompt : '';
  const images = Array.isArray(body.images) ? body.images : [];
  if (!prompt || prompt.length > 30_000) return res.status(400).json({ code: 'bad_request' });
  if (!images.length || images.length > MAX_IMAGES) return res.status(400).json({ code: 'bad_request' });
  for (const im of images) {
    if (!im || !TYPES.includes(im.media_type) || typeof im.data !== 'string' || im.data.length > MAX_IMAGE_B64 || !/^[A-Za-z0-9+/=]+$/.test(im.data)) {
      return res.status(400).json({ code: 'image_rejected' });
    }
  }

  const content = images.map(im => ({ type: 'image', source: { type: 'base64', media_type: im.media_type, data: im.data } }));
  content.push({ type: 'text', text: prompt + '\n\nGeef alleen het JSON-object terug, zonder uitleg ervoor of erna.' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 2000, messages: [{ role: 'user', content }] }),
    });
    if (!r.ok) {
      const code = r.status === 429 || r.status === 529 ? 'rate_limited' : r.status === 400 ? 'image_rejected' : 'server_error';
      console.error('Anthropic API', r.status, (await r.text()).slice(0, 500));
      return res.status(r.status === 429 || r.status === 529 ? 429 : 502).json({ code });
    }
    const j = await r.json();
    const text = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const json = extractJson(text);
    if (!json) return res.status(502).json({ code: 'server_error' });
    return res.status(200).json({ json });
  } catch (e) {
    console.error('AI-koppeling', e);
    return res.status(502).json({ code: 'server_error' });
  }
};
