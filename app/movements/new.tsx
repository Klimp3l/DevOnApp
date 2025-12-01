import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  Text,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Input } from '@/components/ui/input';
import { DateTimePickerInput } from '@/components/ui/date-time-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConnectionIndicator } from '@/components/ConnectionIndicator';
import { useDashboard } from '@/contexts/dashboard.context';
import { useReferenceData } from '@/hooks/use-reference-data';
import referenceService, { Pasture, EventDetail } from '@/services/reference.service';
import databaseService, { Movement } from '@/services/database.service';
import syncService from '@/services/sync.service';
import { useConnectivity } from '@/hooks/useConnectivity';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export default function NewMovementScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isConnected } = useConnectivity();
  const { selectedFarmId } = useDashboard();
  const { farms, events, loading: loadingReference } = useReferenceData();

  // Estados do formulário
  const [farmId, setFarmId] = useState<number | null>(null);
  const [pastureId, setPastureId] = useState<number | null>(null);
  const [eventId, setEventId] = useState<number | null>(null);
  const [eventDetailId, setEventDetailId] = useState<number | null>(null);
  const [dateTime, setDateTime] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados para dados dependentes
  const [pastures, setPastures] = useState<Pasture[]>([]);
  const [eventDetails, setEventDetails] = useState<EventDetail[]>([]);
  const [loadingPastures, setLoadingPastures] = useState(false);
  const [loadingEventDetails, setLoadingEventDetails] = useState(false);

  // Estados para controlar os modais
  const [showFarmSelector, setShowFarmSelector] = useState(false);
  const [showPastureSelector, setShowPastureSelector] = useState(false);
  const [showEventSelector, setShowEventSelector] = useState(false);
  const [showEventDetailSelector, setShowEventDetailSelector] = useState(false);

  // Inicializa com a fazenda selecionada no dashboard
  useEffect(() => {
    if (selectedFarmId && !farmId) {
      setFarmId(selectedFarmId);
    }
  }, [selectedFarmId]);

  // Carrega pastos quando a fazenda muda
  useEffect(() => {
    if (farmId) {
      loadPastures(farmId);
    } else {
      setPastures([]);
      setPastureId(null);
    }
  }, [farmId]);

  // Carrega detalhes do evento quando o evento muda
  useEffect(() => {
    if (eventId) {
      loadEventDetails(eventId);
    } else {
      setEventDetails([]);
      setEventDetailId(null);
    }
  }, [eventId]);

  const loadPastures = async (selectedFarmId: number) => {
    try {
      setLoadingPastures(true);
      const data = await referenceService.getPastures(selectedFarmId);
      setPastures(data);

      // Seleciona o primeiro pasto automaticamente
      if (data.length > 0) {
        setPastureId(data[0].pastureId);
      }
    } catch (error) {
      console.error('Erro ao carregar pastos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os pastos');
    } finally {
      setLoadingPastures(false);
    }
  };

  const loadEventDetails = async (selectedEventId: number) => {
    try {
      setLoadingEventDetails(true);
      const data = await referenceService.getEventDetails(selectedEventId);
      setEventDetails(data);

      // Seleciona o primeiro detalhe automaticamente
      if (data.length > 0) {
        setEventDetailId(data[0].eventDetailId);
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes do evento:', error);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes do evento');
    } finally {
      setLoadingEventDetails(false);
    }
  };

  const handleSave = async () => {
    // Validações
    if (!farmId || !pastureId || !eventId || !dateTime) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      // Gera um UUID único para a movimentação
      const uuid = uuidv4();

      // Busca nomes para salvar junto
      const farm = farms.find(f => f.farmId === farmId);
      const pasture = pastures.find(p => p.pastureId === pastureId);
      const event = events.find(e => e.eventId === eventId);
      const eventDetail = eventDetails.find(ed => ed.eventDetailId === eventDetailId);

      const movement: Movement = {
        localId: uuid,
        movementId: 0,
        farmId: farmId,
        farm: farm!,
        pastureId: pastureId,
        pasture: pasture!,
        eventId: eventId,
        event: event!,
        eventDetailId: eventDetailId || undefined,
        eventDetail: eventDetail || undefined,
        date: dateTime.toISOString(),
        comment: notes || '',
        status: 'active',
        movementDetails: [],
        movementMedias: [],
        synced: 0,
      };

      // Salva localmente
      await databaseService.saveMovement(movement);

      // Se estiver online, tenta sincronizar imediatamente
      if (isConnected) {
        await syncService.syncAll();
        Alert.alert(
          'Sucesso',
          'Movimentação salva e sincronizada com sucesso!',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          'Salvo Offline',
          'Movimentação salva localmente. Será sincronizada quando você estiver online.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Erro ao salvar movimentação:', error);
      Alert.alert('Erro', 'Não foi possível salvar a movimentação');
    } finally {
      setLoading(false);
    }
  };

  if (loadingReference) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <Button variant="ghost" onPress={() => router.back()}>
            ← Voltar
          </Button>
          <ConnectionIndicator />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Card style={styles.card}>
            <CardHeader>
              <CardTitle>Nova Movimentação</CardTitle>
            </CardHeader>

            <CardContent>
              {/* Fazenda */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Fazenda *</Text>
                <TouchableOpacity
                  style={[styles.fieldSelector, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setShowFarmSelector(true)}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <Text style={[styles.fieldValue, { color: farmId ? colors.text : colors.placeholder }]}>
                    {farmId ? farms.find(f => f.farmId === farmId)?.name : 'Selecione uma fazenda'}
                  </Text>
                  <Text style={[styles.fieldIcon, { color: colors.icon }]}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Data e Hora */}
              <DateTimePickerInput
                label="Data e Hora *"
                value={dateTime}
                onChange={setDateTime}
                mode="datetime"
                disabled={loading}
              />

              {/* Pasto */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Pasto *</Text>
                {loadingPastures ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.fieldSelector, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setShowPastureSelector(true)}
                    activeOpacity={0.7}
                    disabled={loading || !farmId || pastures.length === 0}
                  >
                    <Text style={[styles.fieldValue, { color: pastureId ? colors.text : colors.placeholder }]}>
                      {pastureId ? pastures.find(p => p.pastureId === pastureId)?.description : 'Selecione um pasto'}
                    </Text>
                    <Text style={[styles.fieldIcon, { color: colors.icon }]}>▼</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Evento */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Evento *</Text>
                <TouchableOpacity
                  style={[styles.fieldSelector, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setShowEventSelector(true)}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <Text style={[styles.fieldValue, { color: eventId ? colors.text : colors.placeholder }]}>
                    {eventId ? (() => {
                      const event = events.find(e => e.eventId === eventId);
                      return event ? `${event.description}` : 'Selecione um evento';
                    })() : 'Selecione um evento'}
                  </Text>
                  <Text style={[styles.fieldIcon, { color: colors.icon }]}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Detalhe do Evento */}
              {eventId && eventDetails.length > 0 && (
                <View style={styles.fieldContainer}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Detalhe do Evento</Text>
                  {loadingEventDetails ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.fieldSelector, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => setShowEventDetailSelector(true)}
                      activeOpacity={0.7}
                      disabled={loading || eventDetails.length === 0}
                    >
                      <Text style={[styles.fieldValue, { color: eventDetailId ? colors.text : colors.placeholder }]}>
                        {eventDetailId ? eventDetails.find(ed => ed.eventDetailId === eventDetailId)?.description : 'Selecione um detalhe'}
                      </Text>
                      <Text style={[styles.fieldIcon, { color: colors.icon }]}>▼</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Observações */}
              <Input
                label="Observações"
                placeholder="Digite observações (opcional)"
                value={notes}
                onChangeText={setNotes}
                editable={!loading}
                multiline
                numberOfLines={4}
                style={{ height: 80 }}
              />

              <Button
                onPress={handleSave}
                disabled={loading}
                loading={loading}
                style={styles.saveButton}
              >
                Salvar Movimentação
              </Button>
            </CardContent>
          </Card>
        </ScrollView>

        {/* Modal de Seleção de Fazenda */}
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
            <Pressable onPress={(e) => e.stopPropagation()}>
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
                        farmId === farm.farmId && {
                          backgroundColor: colors.primaryLight,
                        },
                      ]}
                      onPress={() => {
                        setFarmId(farm.farmId);
                        setShowFarmSelector(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          { color: colors.text },
                          farmId === farm.farmId && {
                            fontWeight: 'bold',
                            color: colors.primary,
                          },
                        ]}
                      >
                        {farm.name}
                      </Text>
                      {farmId === farm.farmId && (
                        <Text style={[styles.modalCheckmark, { color: colors.primary }]}>
                          ✓
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Modal de Seleção de Pasto */}
        <Modal
          visible={showPastureSelector}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPastureSelector(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowPastureSelector(false)}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    Selecione o Pasto
                  </Text>
                </View>
                <ScrollView style={styles.modalScroll}>
                  {pastures.map((pasture) => (
                    <TouchableOpacity
                      key={pasture.pastureId}
                      style={[
                        styles.modalOption,
                        { borderBottomColor: colors.border },
                        pastureId === pasture.pastureId && {
                          backgroundColor: colors.primaryLight,
                        },
                      ]}
                      onPress={() => {
                        setPastureId(pasture.pastureId);
                        setShowPastureSelector(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          { color: colors.text },
                          pastureId === pasture.pastureId && {
                            fontWeight: 'bold',
                            color: colors.primary,
                          },
                        ]}
                      >
                        {pasture.description}
                      </Text>
                      {pastureId === pasture.pastureId && (
                        <Text style={[styles.modalCheckmark, { color: colors.primary }]}>
                          ✓
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Modal de Seleção de Evento */}
        <Modal
          visible={showEventSelector}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowEventSelector(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowEventSelector(false)}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    Selecione o Evento
                  </Text>
                </View>
                <ScrollView style={styles.modalScroll}>
                  {events.map((event) => (
                    <TouchableOpacity
                      key={event.eventId}
                      style={[
                        styles.modalOption,
                        { borderBottomColor: colors.border },
                        eventId === event.eventId && {
                          backgroundColor: colors.primaryLight,
                        },
                      ]}
                      onPress={() => {
                        setEventId(event.eventId);
                        setShowEventSelector(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          { color: colors.text },
                          eventId === event.eventId && {
                            fontWeight: 'bold',
                            color: colors.primary,
                          },
                        ]}
                      >
                        {event.description}
                      </Text>
                      {eventId === event.eventId && (
                        <Text style={[styles.modalCheckmark, { color: colors.primary }]}>
                          ✓
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Modal de Seleção de Detalhe do Evento */}
        <Modal
          visible={showEventDetailSelector}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowEventDetailSelector(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowEventDetailSelector(false)}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    Selecione o Detalhe do Evento
                  </Text>
                </View>
                <ScrollView style={styles.modalScroll}>
                  {eventDetails.map((detail) => (
                    <TouchableOpacity
                      key={detail.eventDetailId}
                      style={[
                        styles.modalOption,
                        { borderBottomColor: colors.border },
                        eventDetailId === detail.eventDetailId && {
                          backgroundColor: colors.primaryLight,
                        },
                      ]}
                      onPress={() => {
                        setEventDetailId(detail.eventDetailId);
                        setShowEventDetailSelector(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          { color: colors.text },
                          eventDetailId === detail.eventDetailId && {
                            fontWeight: 'bold',
                            color: colors.primary,
                          },
                        ]}
                      >
                        {detail.description}
                      </Text>
                      {eventDetailId === detail.eventDetailId && (
                        <Text style={[styles.modalCheckmark, { color: colors.primary }]}>
                          ✓
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  card: {
    width: '100%',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  saveButton: {
    marginTop: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  fieldSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  fieldValue: {
    fontSize: 16,
    flex: 1,
  },
  fieldIcon: {
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
});
