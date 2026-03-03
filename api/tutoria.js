// api/tutoria.js — Vercel Serverless Function
// Fa de proxy entre el frontend i l'API de Groq (gratuïta, evita CORS)

export default async function handler(req, res) {
  // CORS sempre primer
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Mètode no permès' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY no configurada a Vercel Environment Variables' });
  }

  if (!req.body || !req.body.prompt) {
    return res.status(400).json({ error: 'Falta el camp prompt' });
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
        messages: [{ role: 'user', content: req.body.prompt }],
        max_tokens: 1000,
        temperature: 0.8,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error Groq:', response.status, JSON.stringify(data));
      return res.status(response.status).json({ error: data.error?.message || 'Error de Groq' });
    }

    const text = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ text });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
