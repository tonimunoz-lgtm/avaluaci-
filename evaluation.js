/**
 * SISTEMA DE EVALUACIÓN POR ASSOLIMENTS
 * Módulo independiente para gestionar escalas de evaluación
 * No requiere cambios en app.js
 */

window.EvaluationSystem = (function() {
  
  // Escalas de evaluación disponibles
  const SCALES = {
    NUMERIC: {
      id: 'numeric',
      name: 'Numèrica (0-10)',
      values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      type: 'number'
    },
    ASSOLIMENTS: {
      id: 'assoliments',
      name: 'Assoliments',
      values: ['NA', 'AS', 'AN', 'AE'],
      type: 'letter'
    }
  };

  // Mapeo de assoliments a valores numéricos (para búsqueda de correlación, NO para cálculos)
  const ASSOLIMENTS_VALUES = {
    'NA': 0,  // No Assolit
    'AS': 3.5, // Assolit amb suport
    'AN': 6.5, // Assolit normalment
    'AE': 9    // Assolit excepcionalmen
  };

  /**
   * Obtener escala de una actividad
   */
  async function getActivityScale(activityId) {
    try {
      const doc = await db.collection('activitats').doc(activityId).get();
      if (!doc.exists) return SCALES.NUMERIC;
      
      const data = doc.data();
      return SCALES[data.evaluationScale] || SCALES.NUMERIC;
    } catch (e) {
      console.error('Error obteniendo escala:', e);
      return SCALES.NUMERIC;
    }
  }

  /**
   * Establecer escala de una actividad
   */
  async function setActivityScale(activityId, scaleId) {
    try {
      await db.collection('activitats').doc(activityId).update({
        evaluationScale: scaleId
      });
      return true;
    } catch (e) {
      console.error('Error estableciendo escala:', e);
      return false;
    }
  }

  /**
   * Crear o actualizar una rúbrica
   */
  async function saveRubric(activityId, rubricData) {
    try {
      await db.collection('activitats').doc(activityId).update({
        rubric: rubricData,
        rubricEnabled: true
      });
      return true;
    } catch (e) {
      console.error('Error guardando rúbrica:', e);
      return false;
    }
  }

  /**
   * Obtener rúbrica de una actividad
   */
  async function getRubric(activityId) {
    try {
      const doc = await db.collection('activitats').doc(activityId).get();
      if (!doc.exists) return null;
      
      return doc.data().rubric || null;
    } catch (e) {
      console.error('Error obteniendo rúbrica:', e);
      return null;
    }
  }

  /**
   * Generar rúbrica automática con IA (Claude API)
   */
  async function generateRubricWithAI(activityName, activityDescription, evaluationScale) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
Escala: ${evaluationScale === 'assoliments' ? 'NA, AS, AN, AE' : '0-10'}

Si es assoliments, proporciona 4 criteris (un per cada nivell: NA, AS, AN, AE).
Si es numèrica, proporciona 4-5 criteris amb descriptors pels rangs.

Format JSON:
{
  "criteria": [
    {
      "name": "Nom del criteri",
      "description": "Descripció general",
      "levels": [
        {"level": "NA/AS/AN/AE o 0-2, 3-5, 6-8, 9-10", "descriptor": "Descripció concisa"}
      ]
    }
  ]
}

Tota la rúbrica ha d'estar en CATALAN i ser positiva/constructiva.`
            }
          ]
        })
      });

      if (!response.ok) {
        console.error('Error API:', response.status);
        return null;
      }

      const data = await response.json();
      const content = data.content[0].text;
      
      // Extraer JSON de la respuesta
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('Error generando rúbrica:', e);
      return null;
    }
  }

  /**
   * Generar feedback automático para un alumno (con IA)
   */
  async function generateStudentFeedback(studentName, activityName, score, evaluationScale, rubric) {
    try {
      const scaleType = evaluationScale === 'assoliments' ? 'assoliments' : 'numèrica';
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
Qualificació: ${score} (escala: ${scaleType})
${rubric ? `Rúbrica:\n${JSON.stringify(rubric, null, 2)}` : ''}

Requeriments:
- Massa breu (2-3 frases)
- Positiu i motivador
- Direccionado a FAMÍLIES (es per enviar-los per correu)
- Inclou punts forts i àrees de millora
- EN CATALAN

Resposta:
`
            }
          ]
        })
      });

      if (!response.ok) {
        console.error('Error API:', response.status);
        return null;
      }

      const data = await response.json();
      return data.content[0].text.trim();
    } catch (e) {
      console.error('Error generando feedback:', e);
      return null;
    }
  }

  /**
   * Validar que un valor cumple con la escala
   */
  function isValidScore(score, scaleId) {
    const scale = SCALES[scaleId] || SCALES.NUMERIC;
    return scale.values.includes(score);
  }

  /**
   * Convertir assoliment a número (solo para referencia, NO para cálculos)
   */
  function assolimentToNumber(assoliment) {
    return ASSOLIMENTS_VALUES[assoliment] || 0;
  }

  /**
   * Verificar si una actividad usa evaluación numérica
   * (para excluir assoliments de fórmulas)
   */
  async function isNumericActivity(activityId) {
    const scale = await getActivityScale(activityId);
    return scale.id === 'NUMERIC';
  }

  /**
   * Obtener todas las escalas disponibles
   */
  function getAvailableScales() {
    return Object.values(SCALES);
  }

  /**
   * Obtener escala por ID
   */
  function getScaleById(scaleId) {
    return SCALES[scaleId] || SCALES.NUMERIC;
  }

  // Exportar API pública
  return {
    SCALES,
    ASSOLIMENTS_VALUES,
    getActivityScale,
    setActivityScale,
    saveRubric,
    getRubric,
    generateRubricWithAI,
    generateStudentFeedback,
    isValidScore,
    assolimentToNumber,
    isNumericActivity,
    getAvailableScales,
    getScaleById
  };
})();
