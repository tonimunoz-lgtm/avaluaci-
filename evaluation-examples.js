/**
 * EJEMPLOS DE USO DEL SISTEMA DE EVALUACIÓN
 * Casos de prueba y funciones de demostración
 * 
 * NOTA: Este archivo es OPCIONAL, solo para testing
 */

window.EvaluationExamples = (function() {

  /**
   * Test 1: Cambiar actividad a escala de assoliments
   */
  async function testChangeToAssoliments() {
    console.log('TEST 1: Cambiar actividad a Assoliments');
    
    const activityId = window.currentCalcActivityId || 'test-act-1';
    
    await EvaluationSystem.setActivityScale(activityId, 'ASSOLIMENTS');
    const scale = await EvaluationSystem.getActivityScale(activityId);
    
    console.log('✅ Escala cambiada a:', scale.name);
    console.log('Valores permitidos:', scale.values);
  }

  /**
   * Test 2: Validar valores de escala
   */
  function testValidateScores() {
    console.log('TEST 2: Validar puntuaciones');
    
    const scores = [5, 8, 'NA', 'AS', 'AN', 'AE', 'INVALID'];
    
    scores.forEach(score => {
      const isValidNum = EvaluationSystem.isValidScore(score, 'NUMERIC');
      const isValidAss = EvaluationSystem.isValidScore(score, 'ASSOLIMENTS');
      
      console.log(`${score}: Numérica=${isValidNum}, Assoliments=${isValidAss}`);
    });
  }

  /**
   * Test 3: Crear rúbrica manualmente
   */
  async function testCreateRubricManual() {
    console.log('TEST 3: Crear rúbrica manual');
    
    const activityId = window.currentCalcActivityId || 'test-act-1';
    
    const rubric = {
      criteria: [
        {
          name: 'Originalitat',
          description: 'Creativitat i novetat en l\'enfocament',
          levels: [
            { level: 'NA', descriptor: 'Molt poc original, segueix models exactes' },
            { level: 'AS', descriptor: 'Alguns elements originals amb suport' },
            { level: 'AN', descriptor: 'Bona originalitat en la majoria d\'aspectes' },
            { level: 'AE', descriptor: 'Molt original i innovador en tots els aspectes' }
          ]
        },
        {
          name: 'Presentació',
          description: 'Qualitat visual i estructura del treball',
          levels: [
            { level: 'NA', descriptor: 'Presentació desordenada i difícil de seguir' },
            { level: 'AS', descriptor: 'Presentació clara amb alguns millores' },
            { level: 'AN', descriptor: 'Presentació ordenada i professionalitzada' },
            { level: 'AE', descriptor: 'Presentació excel·lent i molt ben estructurada' }
          ]
        }
      ]
    };
    
    await EvaluationSystem.saveRubric(activityId, rubric);
    console.log('✅ Rúbrica guardada correctament');
  }

  /**
   * Test 4: Generar rúbrica con IA
   */
  async function testGenerateRubricWithAI() {
    console.log('TEST 4: Generar rúbrica con IA');
    
    const activityId = window.currentCalcActivityId || 'test-act-1';
    
    try {
      const rubric = await EvaluationSystem.generateRubricWithAI(
        'Projecte final de ciències',
        'Investigació sobre el cicle de l\'aigua amb experiments pràctics',
        'assoliments'
      );
      
      if (rubric) {
        console.log('✅ Rúbrica generada:');
        console.log(JSON.stringify(rubric, null, 2));
        
        // Guardar
        await EvaluationSystem.saveRubric(activityId, rubric);
        console.log('✅ Rúbrica guardada en BD');
      }
    } catch (e) {
      console.error('❌ Error generando rúbrica:', e);
    }
  }

  /**
   * Test 5: Generar feedback para alumno
   */
  async function testGenerateFeedback() {
    console.log('TEST 5: Generar feedback automático');
    
    const activityId = window.currentCalcActivityId || 'test-act-1';
    const scale = await EvaluationSystem.getActivityScale(activityId);
    const rubric = await EvaluationSystem.getRubric(activityId);
    
    try {
      const feedback = await EvaluationSystem.generateStudentFeedback(
        'Joan Martínez',
        'Projecte de ciències',
        'AN', // o 7.5 si es numérica
        scale.id,
        rubric
      );
      
      if (feedback) {
        console.log('✅ Feedback generado:');
        console.log(feedback);
      }
    } catch (e) {
      console.error('❌ Error generando feedback:', e);
    }
  }

  /**
   * Test 6: Convertir assoliment a número
   */
  function testAssolimentToNumber() {
    console.log('TEST 6: Convertir assoliments a números');
    
    const assoliments = ['NA', 'AS', 'AN', 'AE'];
    
    assoliments.forEach(ass => {
      const num = EvaluationSystem.assolimentToNumber(ass);
      console.log(`${ass} → ${num}`);
    });
  }

  /**
   * Test 7: Comprobar si actividad es numérica
   */
  async function testIsNumericActivity() {
    console.log('TEST 7: Verificar tipo de actividad');
    
    const activityId = window.currentCalcActivityId || 'test-act-1';
    const isNumeric = await EvaluationSystem.isNumericActivity(activityId);
    
    console.log(`Actividad ${activityId} es numérica: ${isNumeric}`);
  }

  /**
   * Test 8: Listar escalas disponibles
   */
  function testGetAvailableScales() {
    console.log('TEST 8: Escalas disponibles');
    
    const scales = EvaluationSystem.getAvailableScales();
    
    scales.forEach(scale => {
      console.log(`${scale.name}: ${scale.values.join(', ')}`);
    });
  }

  /**
   * Test 9: UI - Crear input dinámico
   */
  function testCreateScaleInput() {
    console.log('TEST 9: Crear inputs dinámicos según escala');
    
    const numericInput = EvaluationUI.createScaleInput('act-1', '7.5', 'NUMERIC');
    const assolimentsInput = EvaluationUI.createScaleInput('act-2', 'AN', 'ASSOLIMENTS');
    
    console.log('✅ Input numérico:', numericInput.type, numericInput.value);
    console.log('✅ Input assoliments:', assolimentsInput.tagName, assolimentsInput.value);
  }

  /**
   * Test 10: Simular flujo completo
   */
  async function testCompleteFlow() {
    console.log('\n=== TEST COMPLETO ===\n');
    
    const activityId = window.currentCalcActivityId;
    if (!activityId) {
      console.error('❌ No hay actividad actual seleccionada');
      return;
    }

    try {
      // 1. Cambiar a assoliments
      console.log('1️⃣ Cambiando a assoliments...');
      await EvaluationSystem.setActivityScale(activityId, 'ASSOLIMENTS');
      
      // 2. Generar rúbrica
      console.log('2️⃣ Generando rúbrica...');
      const rubric = await EvaluationSystem.generateRubricWithAI(
        'Activitat Test',
        'Descripció de test',
        'assoliments'
      );
      
      if (rubric) {
        await EvaluationSystem.saveRubric(activityId, rubric);
        console.log('✅ Rúbrica guardada');
      }
      
      // 3. Generar feedback
      console.log('3️⃣ Generando feedback...');
      const feedback = await EvaluationSystem.generateStudentFeedback(
        'Maria García',
        'Activitat Test',
        'AN',
        'ASSOLIMENTS',
        rubric
      );
      
      if (feedback) {
        console.log('✅ Feedback:', feedback);
      }
      
      console.log('\n✅ FLUJO COMPLETO EXITOSO\n');
      
    } catch (e) {
      console.error('❌ Error en flujo:', e);
    }
  }

  /**
   * Ejecutar todos los tests
   */
  async function runAllTests() {
    console.clear();
    console.log('🧪 INICIANDO TESTS DEL SISTEMA DE EVALUACIÓN\n');
    
    testValidateScores();
    console.log('---\n');
    
    testAssolimentToNumber();
    console.log('---\n');
    
    testGetAvailableScales();
    console.log('---\n');
    
    testCreateScaleInput();
    console.log('---\n');
    
    await testChangeToAssoliments();
    console.log('---\n');
    
    await testIsNumericActivity();
    console.log('---\n');
    
    console.log('🎉 TESTS COMPLETADOS');
  }

  // Exportar funciones
  return {
    testChangeToAssoliments,
    testValidateScores,
    testCreateRubricManual,
    testGenerateRubricWithAI,
    testGenerateFeedback,
    testAssolimentToNumber,
    testIsNumericActivity,
    testGetAvailableScales,
    testCreateScaleInput,
    testCompleteFlow,
    runAllTests
  };
})();

/**
 * CÓMO USAR EN LA CONSOLA DEL NAVEGADOR:
 * 
 * // Ejecutar un test específico:
 * EvaluationExamples.testValidateScores();
 * 
 * // Ejecutar todos:
 * EvaluationExamples.runAllTests();
 * 
 * // Cambiar actividad a assoliments:
 * EvaluationExamples.testChangeToAssoliments();
 * 
 * // Generar rúbrica con IA:
 * EvaluationExamples.testGenerateRubricWithAI();
 * 
 * // Generar feedback:
 * EvaluationExamples.testGenerateFeedback();
 */
