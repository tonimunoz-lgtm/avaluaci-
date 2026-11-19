// api/tutoria.js — Vercel Serverless Function
// Proxy entre el frontend i l'API de Groq.
//
// Seguretat (fase 0):
//  - Exigeix un ID token de Firebase (Authorization: Bearer <token>).
//  - La validesa del token i l'estat del compte (no suspès/eliminat) es comproven
//    llegint professors/{uid} a Firestore amb el mateix token: és Firestore qui
//    verifica la signatura, no aquest codi.
//  - CORS només per a orígens declarats a ALLOWED_ORIGINS (mateix origen: sense CORS).
//  - Límit de mida del prompt i límit de peticions per usuari.
//
// Variables d'entorn a Vercel:
//  GROQ_API_KEY       (obligatòria)
//  FIREBASE_PROJECT_ID (opcional, per defecte gestornotes-cc6d0)
//  ALLOWED_ORIGINS    (opcional, llista separada per comes: https://el-teu-domini.com)

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'gestornotes-cc6d0';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

const MAX_PROMPT_CHARS = 8000;
const RATE_MAX = 20;               // peticions
const RATE_WINDOW_MS = 10 * 60e3;  // per cada 10 minuts i usuari
const hits = new Map();            // uid -> [timestamps]; s'esborra quan s'inicia una instància nova

function rateLimited(uid) {
  const now = Date.now();
  const list = (hits.get(uid) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_MAX) { hits.set(uid, list); return true; }
  list.push(now);
  hits.set(uid, list);
  if (hits.size > 5000) { // evita créixer sense límit
    for (const [k, v] of hits) if (!v.some(t => now - t < RATE_WINDOW_MS)) hits.delete(k);
  }
  return false;
}

// Només s'usa per saber quin document llegir; l'autoritat és Firestore.
function uidFromToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    const uid = payload.user_id || payload.sub;
    return typeof uid === 'string' && /^[A-Za-z0-9_-]{6,128}$/.test(uid) ? uid : null;
  } catch { return null; }
}

// Retorna { ok, uid, reason }
async function checkUser(token) {
  const uid = uidFromToken(token);
  if (!uid) return { ok: false, reason: 'Token no vàlid' };

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}` +
              `/databases/(default)/documents/professors/${uid}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 401 || r.status === 403) return { ok: false, reason: 'Sessió no vàlida o caducada' };
  if (!r.ok) return { ok: false, reason: 'No s\'ha pogut verificar l\'usuari' };

  const doc = await r.json();
  const f = doc.fields || {};
  if (f.suspended?.booleanValue === true || f.deleted?.booleanValue === true) {
    return { ok: false, reason: 'Compte no actiu' };
  }
  return { ok: true, uid };
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Mètode no permès' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Servei d\'IA no configurat' });

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return res.status(401).json({ error: 'Cal iniciar sessió' });

  let user;
  try { user = await checkUser(token); }
  catch (e) { console.error('Verificació:', e); return res.status(502).json({ error: 'No s\'ha pogut verificar l\'usuari' }); }
  if (!user.ok) return res.status(401).json({ error: user.reason });

  if (rateLimited(user.uid)) {
    return res.status(429).json({ error: 'Massa peticions. Espera uns minuts.' });
  }

  const prompt = req.body && req.body.prompt;
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Falta el camp prompt' });
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return res.status(413).json({ error: 'El prompt és massa llarg' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.8,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error Groq:', response.status, JSON.stringify(data));
      return res.status(502).json({ error: 'Error del servei d\'IA' });
    }

    const text = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ text });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: 'Error intern' });
  }
}
