/**
 * SISTEMA DE EVALUACIÓN POR ASSOLIMENTS
 * Módulo independiente para gestionar escalas de evaluación
 * No requiere cambios en app.js
 */

window.EvaluationSystem = (function() {
  
  // Escalas de evaluación disponibles
  const SCALES = {
    NUMERIC: {
      id: 'NUMERIC',
      name: 'Numèrica (0-10)',
      values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      type: 'number'
    },
    ASSOLIMENTS: {
      id: 'ASSOLIMENTS',
      name: 'Assoliments',
      values: ['NA', 'AS', 'AN', 'AE'],
      type: 'letter'
    }
  };

  // Mapeo de assoliments a valores numéricos (para referencia, NO para cálculos)
  const ASSOLIMENTS_VALUES = {
    'NA': 0,
    'AS': 3.5,
    'AN': 6.5,
    'AE': 9
  };

  /**
   * Obtener escala de una actividad
   */
  async function getActivityScale(activityId) {
    try {
      const doc = await firebase.firestore().collection('activitats').doc(activityId).get();
      if (!doc.exists) return SCALES.NUMERIC;
      
      const data = doc.data();
      const scaleId = data.evaluationScale || 'NUMERIC';
      return SCALES[scaleId] || SCALES.NUMERIC;
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
      await firebase.firestore().collection('activitats').doc(activityId).update({
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
      await firebase.firestore().collection('activitats').doc(activityId).update({
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
      const doc = await firebase.firestore().collection('activitats').doc(activityId).get();
      if (!doc.exists) return null;
      
      return doc.data().rubric || null;
    } catch (e) {
      console.error('Error obteniendo rúbrica:', e);
      return null;
    }
  }

  /**
   * Generar rúbrica automática con IA (Claude API)
   * 🔹 CORRECCIÓN: Usar proxy para evitar CORS desde navegador
   */
  async function generateRubricWithAI(activityName, activityDescription, evaluationScale) {
    try {
      // URL de proxy o backend que haga la petición a Anthropics API
      const proxyUrl = '/api/anthropic-rubric'; // <-- configurar en tu servidor
      const payload = {
        activityName,
        activityDescription,
        evaluationScale
      };

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error('Error API:', response.status);
        return null;
      }

      const data = await response.json();
      return data.rubric || null;
    } catch (e) {
      console.error('Error generando rúbrica:', e);
      return null;
    }
  }

  /**
   * Generar feedback automático para un alumno (con IA)
   * 🔹 CORRECCIÓN: Usar proxy para evitar CORS desde navegador
   */
  async function generateStudentFeedback(studentName, activityName, score, evaluationScale, rubric) {
    try {
      const proxyUrl = '/api/anthropic-feedback'; // <-- configurar en tu servidor
      const payload = { studentName, activityName, score, evaluationScale, rubric };

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error('Error API:', response.status);
        return null;
      }

      const data = await response.json();
      return data.feedback || null;
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
