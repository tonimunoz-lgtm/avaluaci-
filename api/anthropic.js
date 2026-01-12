// api/anthropic.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { messages, max_tokens, model } = req.body;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.ANTHROPIC_API_KEY
      },
      body: JSON.stringify({ messages, max_tokens, model })
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
