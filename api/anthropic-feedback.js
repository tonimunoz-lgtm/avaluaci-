// api/anthropic-feedback.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { studentName, activityName, score, evaluationScale, rubric } = req.body;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.ANTHROPIC_API_KEY
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Genera un feedback positiu i constructiu en CATALAN per a un alumne.
Alumne: ${studentName}
Activitat: ${activityName}
Qualificació: ${score} (escala: ${evaluationScale})
${rubric ? `Rúbrica:\n${JSON.stringify(rubric, null, 2)}` : ''}

Requeriments:
- Massa breu (2-3 frases)
- Positiu i motivador
- Direccionado a FAMÍLIES
- Inclou punts forts i àrees de millora
- EN CATALAN

Resposta:
`
          }
        ]
      })
    });

    const data = await response.json();
    const feedback = data.content?.[0]?.text?.trim() || null;

    res.status(200).json({ feedback });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
