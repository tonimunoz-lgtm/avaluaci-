// api/tutoria.js — Vercel Serverless Function
// Fa de proxy entre el frontend i l'API d'Anthropic (evita CORS)

export default async function handler(req, res) {
  // Només acceptem POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Mètode no permès' });
  }

  // Cabeceres CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key no configurada al servidor' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error('Error cridant Anthropic:', err);
    return res.status(500).json({ error: err.message });
  }
}
