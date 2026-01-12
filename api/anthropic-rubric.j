// api/anthropic-rubric.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { activityName, activityDescription, evaluationScale } = req.body;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.ANTHROPIC_API_KEY
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Genera una rúbrica de evaluación en CATALAN per a aquesta activitat.
Activitat: ${activityName}
Descripció: ${activityDescription || 'Sense descripció'}
Escala: ${evaluationScale === 'ASSOLIMENTS' ? 'NA, AS, AN, AE' : '0-10'}

Si es assoliments, proporciona 4 criteris (un per cada nivell: NA, AS, AN, AE).
Si es numèrica, proporciona 4-5 criteris amb descriptors pels rangs.

Format JSON:
{
  "criteria": [
    {
      "name": "Nom del criteri",
      "description": "Descripció general",
      "levels": [
        {"level": "NA/AS/AN/AE o 0-2,3-5,6-8,9-10", "descriptor": "Descripció concisa"}
      ]
    }
  ]
}`
          }
        ]
      })
    });

    const data = await response.json();

    // Extraer JSON de la respuesta
    const content = data.content?.[0]?.text || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const rubric = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    res.status(200).json({ rubric });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
