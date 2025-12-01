import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ConnectionIndicator } from '@/components/ConnectionIndicator';
import { useAuth } from '@/contexts/auth.context';
import { useDashboard } from '@/contexts/dashboard.context';
import databaseService from '@/services/database.service';
import { useFarms } from '@/hooks/use-reference-data';
import authService from '@/services/auth.service';
import { API_ENDPOINTS } from '@/config/api';

interface DashboardData {
  totalAnimals: number;
  totalMovements: number;
  animalsByFarm: {
    farmId: number;
    farmName: string;
    quantity: number;
  }[];
  animalsByPasture: {
    pastureId: number;
    pastureDescription: string;
    farmId?: number;
    quantity: number;
  }[];
  pasturePositions: {
    farmId: number;
    farmName: string;
    pastureId: number;
    pastureDescription: string;
    animalTypeId: number;
    animalTypeDescription: string;
    breedId: number;
    breedName: string;
    ageGroupId: number;
    ageGroupDescription: string;
    gender: 'M' | 'F';
    quantity: number;
  }[];
}

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const { farms, loading: loadingFarms } = useFarms();
  const { selectedFarmId, setSelectedFarmId } = useDashboard();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [allData, setAllData] = useState<any>(null); // Armazena todos os dados da API
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFarmSelector, setShowFarmSelector] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (selectedFarmId && allData) {
      // Filtra os dados pela fazenda selecionada
      filterDataByFarm(selectedFarmId);
    }
  }, [selectedFarmId, allData]);

  async function loadDashboardData() {
    try {
      setLoading(true);

      // Busca dados do dashboard da API (uma única vez)
      const token = await authService.getAccessToken();
      if (!token) {
        throw new Error('Token não encontrado');
      }

      const response = await fetch(`${API_ENDPOINTS.movements.homeDashboard}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Session-Token': token,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar dados do dashboard');
      }

      const data = await response.json();

      // Armazena todos os dados (totalMovements será buscado por fazenda em filterDataByFarm)
      setAllData(data);

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      // Em caso de erro, carrega apenas dados locais
      setAllData({
        animalsByFarm: [],
        animalsByPasture: [],
        pasturePositions: [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function filterDataByFarm(farmId: number) {
    if (!allData) return;

    // Filtra dados pela fazenda selecionada
    const farmAnimals = allData.animalsByFarm?.find(
      (f: any) => f.farmId === farmId
    );

    const farmPastures = allData.pasturePositions?.filter(
      (p: any) => p.farmId === farmId
    ) || [];

    // Agrupa animais por pasto
    const pastureMap = new Map<number, any>();
    farmPastures.forEach((pos: any) => {
      if (!pastureMap.has(pos.pastureId)) {
        pastureMap.set(pos.pastureId, {
          pastureId: pos.pastureId,
          pastureDescription: pos.pastureDescription,
          farmId: pos.farmId,
          quantity: 0,
        });
      }
      const pasture = pastureMap.get(pos.pastureId);
      pasture.quantity += pos.quantity;
    });

    // Busca total de movimentações da fazenda específica
    const farmStats = await databaseService.getStatsByFarm(farmId);

    setDashboardData({
      totalAnimals: farmAnimals?.quantity || 0,
      totalMovements: farmStats.totalMovements,
      animalsByFarm: allData.animalsByFarm || [],
      animalsByPasture: Array.from(pastureMap.values()),
      pasturePositions: farmPastures,
    });
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
  };

  if (loading || loadingFarms) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.greeting, { color: colors.text }]}>
            Olá, {user?.name?.split(' ')[0] || 'Usuário'}! 👋
          </Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            Visão geral do seu rebanho
          </Text>
        </View>
        <ConnectionIndicator />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Farm Selector */}
        {farms.length > 0 && selectedFarmId && (
          <TouchableOpacity
            style={[styles.farmSelector, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowFarmSelector(true)}
            activeOpacity={0.7}
          >
            <View style={styles.farmSelectorContent}>
              <View style={styles.farmSelectorLeft}>
                <Text style={[styles.farmSelectorLabel, { color: colors.icon }]}>
                  Você está visualizando a fazenda:
                </Text>
                <Text style={[styles.farmSelectorValue, { color: colors.text }]}>
                  {farms.find((f) => f.farmId === selectedFarmId)?.name}
                </Text>
              </View>
              <Text style={[styles.farmSelectorIcon, { color: colors.icon }]}>
                ▼
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Farm Selector Modal */}
        <Modal
          visible={showFarmSelector}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowFarmSelector(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowFarmSelector(false)}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Selecione a Fazenda
                </Text>
              </View>
              <ScrollView style={styles.modalScroll}>
                {farms.map((farm) => (
                  <TouchableOpacity
                    key={farm.farmId}
                    style={[
                      styles.modalOption,
                      { borderBottomColor: colors.border },
                      selectedFarmId === farm.farmId && {
                        backgroundColor: colors.primaryLight,
                      },
                    ]}
                    onPress={() => {
                      setSelectedFarmId(farm.farmId);
                      setShowFarmSelector(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        { color: colors.text },
                        selectedFarmId === farm.farmId && {
                          fontWeight: 'bold',
                          color: colors.primary,
                        },
                      ]}
                    >
                      {farm.name}
                    </Text>
                    {selectedFarmId === farm.farmId && (
                      <Text style={[styles.modalCheckmark, { color: colors.primary }]}>
                        ✓
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        {/* KPI Cards */}
        <View style={styles.kpiContainer}>
          <TouchableOpacity
            style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.kpiIcon, { backgroundColor: '#10b98120' }]}>
              <Text style={styles.kpiIconText}>🐄</Text>
            </View>
            <Text style={[styles.kpiValue, { color: colors.text }]}>
              {dashboardData?.totalAnimals || 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.icon }]}>
              Total de Animais
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/movements')}
          >
            <View style={[styles.kpiIcon, { backgroundColor: '#3b82f620' }]}>
              <Text style={styles.kpiIconText}>📊</Text>
            </View>
            <Text style={[styles.kpiValue, { color: colors.text }]}>
              {dashboardData?.totalMovements || 0}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.icon }]}>
              Total de Movimentações
            </Text>
            <Text style={[styles.kpiSubLabel, { color: colors.placeholder }]}>
              Toque para ver todas
            </Text>
          </TouchableOpacity>
        </View>

        {/* Animals by Pasture */}
        {dashboardData && dashboardData.animalsByPasture.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Animais por Pasto
            </Text>
            <View style={styles.pasturesList}>
              {dashboardData.animalsByPasture.map((pasture) => (
                <View
                  key={pasture.pastureId}
                  style={[styles.pastureItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.pastureLeft}>
                    <Text style={[styles.pastureTitle, { color: colors.text }]}>
                      {pasture.pastureDescription}
                    </Text>
                  </View>
                  <View style={styles.pastureRight}>
                    <Text style={[styles.pastureQuantity, { color: colors.primary }]}>
                      {pasture.quantity}
                    </Text>
                    <Text style={[styles.pastureLabel, { color: colors.icon }]}>
                      animais
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Ações Rápidas
          </Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/movements/new')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primaryLight }]}>
                <Text style={styles.actionIconText}>+</Text>
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]}>
                Nova Movimentação
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/movements')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#3b82f620' }]}>
                <Text style={styles.actionIconText}>📋</Text>
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]}>
                Ver Movimentações
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  farmSelector: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  farmSelectorContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  farmSelectorLeft: {
    flex: 1,
  },
  farmSelectorLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  farmSelectorValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  farmSelectorIcon: {
    fontSize: 12,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: 16,
  },
  modalCheckmark: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  kpiContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  kpiIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  kpiIconText: {
    fontSize: 24,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  kpiSubLabel: {
    fontSize: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '30%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconText: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  pasturesList: {
    gap: 12,
  },
  pastureItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pastureLeft: {
    flex: 1,
  },
  pastureTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  pastureRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  pastureQuantity: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  pastureLabel: {
    fontSize: 11,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
