import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useConnectivity } from '@/hooks/useConnectivity';
import { ConnectionIndicator } from '@/components/ConnectionIndicator';
import databaseService, { Movement } from '@/services/database.service';
import syncService from '@/services/sync.service';
import { useDashboard } from '@/contexts/dashboard.context';
import { useFarms } from '@/hooks/use-reference-data';

export default function MovementsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isConnected } = useConnectivity();
  const { selectedFarmId, setSelectedFarmId } = useDashboard();
  const { farms, loading: loadingFarms } = useFarms();

  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showFarmSelector, setShowFarmSelector] = useState(false);
  const [selectedFilterFarmId, setSelectedFilterFarmId] = useState<number | null>(null);

  useEffect(() => {
    initializeDatabase();
  }, []);

  useEffect(() => {
    if (!loadingFarms) {
      loadMovements();
    }
  }, [selectedFilterFarmId, loadingFarms]);

  useEffect(() => {
    // Listener para sincronização
    const unsubscribe = syncService.addSyncListener((status) => {
      setSyncing(status.status === 'syncing');
      if (status.status === 'success') {
        loadMovements();
      }
    });

    return () => unsubscribe();
  }, []);

  async function initializeDatabase() {
    try {
      await databaseService.initialize();
    } catch (error) {
      console.error('Erro ao inicializar banco:', error);
    }
  }

  async function loadMovements() {
    try {
      let data: Movement[];
      if (selectedFilterFarmId === null) {
        // Todas as fazendas
        data = await databaseService.getMovements();
      } else {
        // Fazenda específica
        data = await databaseService.getMovementsByFarm(selectedFilterFarmId);
      }
      setMovements(data);
    } catch (error) {
      console.error('Erro ao carregar movimentações:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMovements();
  }, []);

  const handleSync = async () => {
    if (!isConnected) {
      alert('Você está offline. Conecte-se à internet para sincronizar.');
      return;
    }

    setSyncing(true);
    const result = await syncService.syncAll();
    setSyncing(false);

    if (result.success) {
      alert(result.message);
    } else {
      alert(`Erro na sincronização: ${result.message}`);
    }
  };

  const handleClearMovements = () => {
    Alert.alert(
      'Limpar Movimentações',
      'Tem certeza que deseja excluir todas as movimentações? Esta ação não pode ser desfeita.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.clearMovements();
              await loadMovements();
              Alert.alert('Sucesso', 'Todas as movimentações foram excluídas');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível limpar as movimentações');
              console.error('Erro ao limpar movimentações:', error);
            }
          },
        },
      ]
    );
  };

  const renderMovementItem = ({ item }: { item: Movement }) => (
    <TouchableOpacity
      style={[styles.movementCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.7}
    >
      <View style={styles.movementHeader}>
        <Text style={[styles.movementEvent, { color: colors.text }]}>
          {item.event.description || `Evento #${item.event.eventId}`}
        </Text>
        <View style={styles.syncBadge}>
          {item.synced === 1 ? (
            <View style={[styles.badge, { backgroundColor: '#10b981' }]}>
              <Text style={styles.badgeText}>✓ Sincronizado</Text>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: '#f59e0b' }]}>
              <Text style={styles.badgeText}>⏳ Pendente</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.movementDetails}>
        <Text style={[styles.detailText, { color: colors.text }]}>
          Data: {item.date}
        </Text>
        <Text style={[styles.detailText, { color: colors.text }]}>
          Fazenda: {item.farm.name || `#${item.farm.farmId}`}
        </Text>
        <Text style={[styles.detailText, { color: colors.text }]}>
          Evento: {item.event.description || `#${item.event.eventId}`}
        </Text>
        {item.eventDetail?.eventDetailId && (
          <Text style={[styles.detailText, { color: colors.text }]}>
            Detalhe: {item.eventDetail.description || `#${item.eventDetail.eventDetailId}`}
          </Text>
        )}
        {item.comment && (
          <Text style={[styles.detailText, { color: colors.icon, fontStyle: 'italic' }]}>
            Obs: {item.comment}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

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
        <Text style={[styles.title, { color: colors.text }]}>Movimentações</Text>
        <ConnectionIndicator />
      </View>

      {/* Farm Selector */}
      {farms.length > 0 && (
        <View style={styles.farmSelectorContainer}>
          <TouchableOpacity
            style={[styles.farmSelector, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowFarmSelector(true)}
            activeOpacity={0.7}
          >
            <View style={styles.farmSelectorContent}>
              <View style={styles.farmSelectorLeft}>
                <Text style={[styles.farmSelectorLabel, { color: colors.icon }]}>
                  Fazenda:
                </Text>
                <Text style={[styles.farmSelectorValue, { color: colors.text }]}>
                  {selectedFilterFarmId === null
                    ? 'Todas'
                    : farms.find((f) => f.farmId === selectedFilterFarmId)?.name || 'Selecione'}
                </Text>
              </View>
              <Text style={[styles.farmSelectorIcon, { color: colors.icon }]}>
                ▼
              </Text>
            </View>
          </TouchableOpacity>
        </View>
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
                Filtrar por Fazenda
              </Text>
            </View>
            <ScrollView style={styles.modalScroll}>
              {/* Opção "Todas" */}
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  { borderBottomColor: colors.border },
                  selectedFilterFarmId === null && {
                    backgroundColor: colors.primaryLight,
                  },
                ]}
                onPress={() => {
                  setSelectedFilterFarmId(null);
                  setShowFarmSelector(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    { color: colors.text },
                    selectedFilterFarmId === null && {
                      fontWeight: 'bold',
                      color: colors.primary,
                    },
                  ]}
                >
                  Todas as Fazendas
                </Text>
                {selectedFilterFarmId === null && (
                  <Text style={[styles.modalCheckmark, { color: colors.primary }]}>
                    ✓
                  </Text>
                )}
              </TouchableOpacity>

              {/* Lista de fazendas */}
              {farms.map((farm) => (
                <TouchableOpacity
                  key={farm.farmId}
                  style={[
                    styles.modalOption,
                    { borderBottomColor: colors.border },
                    selectedFilterFarmId === farm.farmId && {
                      backgroundColor: colors.primaryLight,
                    },
                  ]}
                  onPress={() => {
                    setSelectedFilterFarmId(farm.farmId);
                    setShowFarmSelector(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      { color: colors.text },
                      selectedFilterFarmId === farm.farmId && {
                        fontWeight: 'bold',
                        color: colors.primary,
                      },
                    ]}
                  >
                    {farm.name}
                  </Text>
                  {selectedFilterFarmId === farm.farmId && (
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

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/movements/new')}
        >
          <Text style={styles.buttonText}>+ Nova Movimentação</Text>
        </TouchableOpacity>

        {movements.some(m => m.status !== 'synced') && (
          <TouchableOpacity
            style={[
              styles.syncButton,
              { backgroundColor: isConnected ? colors.primary : colors.border },
            ]}
            onPress={handleSync}
            disabled={!isConnected || syncing}
          >
            {syncing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>🔄 Sincronizar</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {__DEV__ && movements.length > 0 && (
        <View style={styles.devActions}>
          <TouchableOpacity
            style={[styles.clearButton, { backgroundColor: '#ef4444', borderColor: colors.border }]}
            onPress={handleClearMovements}
          >
            <Text style={styles.buttonText}>🗑️ Limpar Movimentações (Dev)</Text>
          </TouchableOpacity>
        </View>
      )}

      {movements.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.icon }]}>
            Nenhuma movimentação registrada
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.placeholder }]}>
            Toque em "Nova Movimentação" para começar
          </Text>
        </View>
      ) : (
        <FlatList
          data={movements}
          renderItem={renderMovementItem}
          keyExtractor={(item, index) => item.localId || `movement-${item.movementId}-${index}`}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  farmSelectorContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  farmSelector: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  farmSelectorContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  farmSelectorLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  farmSelectorLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  farmSelectorValue: {
    fontSize: 14,
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
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  devActions: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  syncButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  movementCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  movementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  movementEvent: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  syncBadge: {
    marginLeft: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  movementDetails: {
    gap: 6,
  },
  detailText: {
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});

