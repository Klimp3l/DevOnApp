/**
 * Tela de Debug - Cache de Dados de Referência
 * 
 * Esta tela é opcional e pode ser usada apenas em desenvolvimento
 * para verificar se os dados estão sendo carregados corretamente.
 * 
 * Para usar, adicione esta tela nas tabs (apenas em DEV) ou
 * acesse via navegação direta.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useReferenceData } from '@/hooks/use-reference-data';
import referenceService from '@/services/reference.service';
import {
  testReferenceDataCache,
  testDependentFilters,
  testCachePerformance,
  runAllTests,
} from '@/scripts/test-reference-cache';

export default function DebugCacheScreen() {
  const {
    farms,
    events,
    breeds,
    animalTypes,
    ageGroups,
    unitOfMeasures,
    loading,
    refresh,
  } = useReferenceData();

  const [testOutput, setTestOutput] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  // Intercepta console.log para mostrar na tela
  const originalLog = console.log;
  const captureLog = (...args: any[]) => {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    setTestOutput(prev => [...prev, message]);
    originalLog(...args);
  };

  const runTest = async (testFn: () => Promise<boolean>, testName: string) => {
    setTesting(true);
    setTestOutput([`🧪 Executando: ${testName}...`]);
    
    // Intercepta logs
    console.log = captureLog;
    
    try {
      await testFn();
    } finally {
      // Restaura console.log
      console.log = originalLog;
      setTesting(false);
    }
  };

  const clearCache = async () => {
    try {
      await referenceService.clearCache();
      setTestOutput(['✅ Cache limpo com sucesso']);
      await refresh();
    } catch (error) {
      setTestOutput(['❌ Erro ao limpar cache: ' + error]);
    }
  };

  const reloadCache = async () => {
    setTesting(true);
    setTestOutput(['📥 Recarregando dados da API...']);
    
    try {
      await referenceService.loadAllReferenceData();
      setTestOutput(prev => [...prev, '✅ Dados recarregados com sucesso']);
      await refresh();
    } catch (error) {
      setTestOutput(prev => [...prev, '❌ Erro ao recarregar: ' + error]);
    } finally {
      setTesting(false);
    }
  };

  if (loading && farms.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Carregando dados de referência...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔍 Debug - Cache de Referência</Text>

      {/* Resumo dos dados em cache */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Dados em Cache</Text>
        <View style={styles.statsContainer}>
          <StatItem label="Fazendas" value={farms.length} />
          <StatItem label="Eventos" value={events.length} />
          <StatItem label="Raças" value={breeds.length} />
          <StatItem label="Tipos de Animais" value={animalTypes.length} />
          <StatItem label="Grupos de Idade" value={ageGroups.length} />
          <StatItem label="Unidades de Medida" value={unitOfMeasures.length} />
        </View>
      </View>

      {/* Botões de teste */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 Testes</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={() => runTest(testReferenceDataCache, 'Cache Básico')}
          disabled={testing}
        >
          <Text style={styles.buttonText}>Testar Cache Básico</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={() => runTest(testDependentFilters, 'Filtros Dependentes')}
          disabled={testing}
        >
          <Text style={styles.buttonText}>Testar Filtros</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={() => runTest(testCachePerformance, 'Performance')}
          disabled={testing}
        >
          <Text style={styles.buttonText}>Testar Performance</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonSuccess]}
          onPress={() => runTest(runAllTests, 'Todos os Testes')}
          disabled={testing}
        >
          <Text style={styles.buttonText}>▶️ Executar Todos</Text>
        </TouchableOpacity>
      </View>

      {/* Ações */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚙️ Ações</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.buttonInfo]}
          onPress={reloadCache}
          disabled={testing}
        >
          <Text style={styles.buttonText}>🔄 Recarregar da API</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonDanger]}
          onPress={clearCache}
          disabled={testing}
        >
          <Text style={styles.buttonText}>🗑️ Limpar Cache</Text>
        </TouchableOpacity>
      </View>

      {/* Output dos testes */}
      {testOutput.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Output</Text>
          <View style={styles.outputContainer}>
            {testOutput.map((line, index) => (
              <Text key={index} style={styles.outputText}>
                {line}
              </Text>
            ))}
          </View>
        </View>
      )}

      {testing && (
        <View style={styles.testingOverlay}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.testingText}>Executando testes...</Text>
        </View>
      )}
    </ScrollView>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  button: {
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#2196F3',
  },
  buttonSuccess: {
    backgroundColor: '#4CAF50',
  },
  buttonInfo: {
    backgroundColor: '#00BCD4',
  },
  buttonDanger: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  outputContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 12,
    maxHeight: 400,
  },
  outputText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#d4d4d4',
    marginBottom: 4,
  },
  testingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  testingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

