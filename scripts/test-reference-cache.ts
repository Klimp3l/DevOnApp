/**
 * Script de teste para verificar o cache de dados de referência
 * 
 * Execute este script para verificar se os dados estão sendo
 * carregados e armazenados corretamente.
 * 
 * Uso:
 * - Importe e chame as funções de teste em um componente
 * - Ou adicione botões de teste em uma tela de debug
 */

import referenceService from '@/services/reference.service';

/**
 * Testa se todos os dados de referência estão disponíveis
 */
export async function testReferenceDataCache() {
  console.log('🧪 Iniciando teste de cache de dados de referência...\n');

  try {
    // Testa Fazendas
    const farms = await referenceService.getFarms();
    console.log('✅ Fazendas:', farms.length, 'registros');
    if (farms.length > 0) {
      console.log('   Exemplo:', farms[0].name);
    }

    // Testa Eventos
    const events = await referenceService.getEvents();
    console.log('✅ Eventos:', events.length, 'registros');
    if (events.length > 0) {
      console.log('   Exemplo:', events[0].name, '(' + events[0].operation + ')');
    }

    // Testa Raças
    const breeds = await referenceService.getBreeds();
    console.log('✅ Raças:', breeds.length, 'registros');
    if (breeds.length > 0) {
      console.log('   Exemplo:', breeds[0].name);
    }

    // Testa Tipos de Animais
    const animalTypes = await referenceService.getAnimalTypes();
    console.log('✅ Tipos de Animais:', animalTypes.length, 'registros');
    if (animalTypes.length > 0) {
      console.log('   Exemplo:', animalTypes[0].name);
    }

    // Testa Grupos de Idade
    const ageGroups = await referenceService.getAgeGroups();
    console.log('✅ Grupos de Idade:', ageGroups.length, 'registros');
    if (ageGroups.length > 0) {
      console.log('   Exemplo:', ageGroups[0].name);
    }

    // Testa Unidades de Medida
    const unitOfMeasures = await referenceService.getUnitOfMeasures();
    console.log('✅ Unidades de Medida:', unitOfMeasures.length, 'registros');
    if (unitOfMeasures.length > 0) {
      console.log('   Exemplo:', unitOfMeasures[0].name, '(' + unitOfMeasures[0].abbreviation + ')');
    }

    // Testa Pastos
    const pastures = await referenceService.getPastures();
    console.log('✅ Pastos:', pastures.length, 'registros');
    if (pastures.length > 0) {
      console.log('   Exemplo:', pastures[0].name, '- Capacidade:', pastures[0].capacity);
    }

    // Testa Detalhes de Eventos
    const eventDetails = await referenceService.getEventDetails();
    console.log('✅ Detalhes de Eventos:', eventDetails.length, 'registros');
    if (eventDetails.length > 0) {
      console.log('   Exemplo:', eventDetails[0].description);
    }

    console.log('\n🎉 Teste concluído com sucesso!');
    console.log('📊 Total de registros em cache:', 
      farms.length + events.length + breeds.length + animalTypes.length + 
      ageGroups.length + unitOfMeasures.length + pastures.length + eventDetails.length
    );

    return true;
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    return false;
  }
}

/**
 * Testa filtros de dados dependentes
 */
export async function testDependentFilters() {
  console.log('🧪 Testando filtros de dados dependentes...\n');

  try {
    // Testa filtro de pastos por fazenda
    const farms = await referenceService.getFarms();
    if (farms.length > 0) {
      const firstFarm = farms[0];
      const pastures = await referenceService.getPastures(firstFarm.farmId);
      console.log('✅ Pastos da fazenda', firstFarm.name + ':', pastures.length, 'registros');
    }

    // Testa filtro de raças por tipo de animal
    const animalTypes = await referenceService.getAnimalTypes();
    if (animalTypes.length > 0) {
      const firstType = animalTypes[0];
      const breeds = await referenceService.getBreeds(firstType.animalTypeId);
      console.log('✅ Raças do tipo', firstType.name + ':', breeds.length, 'registros');
    }

    // Testa filtro de grupos de idade por tipo de animal
    if (animalTypes.length > 0) {
      const firstType = animalTypes[0];
      const ageGroups = await referenceService.getAgeGroups(firstType.animalTypeId);
      console.log('✅ Grupos de idade do tipo', firstType.name + ':', ageGroups.length, 'registros');
    }

    // Testa filtro de detalhes por evento
    const events = await referenceService.getEvents();
    if (events.length > 0) {
      const firstEvent = events[0];
      const eventDetails = await referenceService.getEventDetails(firstEvent.eventId);
      console.log('✅ Detalhes do evento', firstEvent.name + ':', eventDetails.length, 'registros');
    }

    console.log('\n🎉 Teste de filtros concluído com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro durante teste de filtros:', error);
    return false;
  }
}

/**
 * Testa performance do cache
 */
export async function testCachePerformance() {
  console.log('🧪 Testando performance do cache...\n');

  try {
    // Teste 1: Leitura múltipla
    const start1 = Date.now();
    await Promise.all([
      referenceService.getFarms(),
      referenceService.getEvents(),
      referenceService.getBreeds(),
      referenceService.getAnimalTypes(),
    ]);
    const time1 = Date.now() - start1;
    console.log('✅ Leitura paralela de 4 tipos:', time1 + 'ms');

    // Teste 2: Leitura sequencial
    const start2 = Date.now();
    await referenceService.getFarms();
    await referenceService.getEvents();
    await referenceService.getBreeds();
    await referenceService.getAnimalTypes();
    const time2 = Date.now() - start2;
    console.log('✅ Leitura sequencial de 4 tipos:', time2 + 'ms');

    // Teste 3: Leitura individual repetida
    const start3 = Date.now();
    for (let i = 0; i < 10; i++) {
      await referenceService.getFarms();
    }
    const time3 = Date.now() - start3;
    console.log('✅ 10 leituras da mesma tabela:', time3 + 'ms', '(média:', (time3 / 10).toFixed(1) + 'ms)');

    console.log('\n📊 Análise:');
    console.log('  - Paralelo vs Sequencial:', (time2 - time1) + 'ms mais rápido em paralelo');
    console.log('  - Cache está funcionando bem se tempo médio < 50ms');

    return true;
  } catch (error) {
    console.error('❌ Erro durante teste de performance:', error);
    return false;
  }
}

/**
 * Executa todos os testes
 */
export async function runAllTests() {
  console.log('\n🚀 Executando todos os testes de cache de dados de referência\n');
  console.log('='.repeat(60));

  const test1 = await testReferenceDataCache();
  console.log('='.repeat(60));

  const test2 = await testDependentFilters();
  console.log('='.repeat(60));

  const test3 = await testCachePerformance();
  console.log('='.repeat(60));

  console.log('\n📋 Resumo dos Testes:');
  console.log('  - Cache básico:', test1 ? '✅ PASSOU' : '❌ FALHOU');
  console.log('  - Filtros dependentes:', test2 ? '✅ PASSOU' : '❌ FALHOU');
  console.log('  - Performance:', test3 ? '✅ PASSOU' : '❌ FALHOU');

  const allPassed = test1 && test2 && test3;
  console.log('\n' + (allPassed ? '🎉 TODOS OS TESTES PASSARAM!' : '⚠️ ALGUNS TESTES FALHARAM'));

  return allPassed;
}

