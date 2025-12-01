import databaseService, { Movement } from './database.service';
import authService from './auth.service';
import connectivityService from './connectivity.service';
import { API_BASE_URL } from '@/config/api';

class SyncService {
  private isSyncing: boolean = false;
  private syncListeners: Set<(status: SyncStatus) => void> = new Set();

  constructor() {
    this.initializeAutoSync();
  }

  private initializeAutoSync() {
    // Monitora conexão e sincroniza quando voltar online
    connectivityService.addListener(async (isConnected) => {
      if (isConnected && !this.isSyncing) {
        if (__DEV__) {
          console.log('🔄 Conexão restaurada, iniciando sincronização...');
        }
        await this.syncAll();
      }
    });
  }

  /**
   * Sincroniza todos os dados pendentes
   */
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      if (__DEV__) {
        console.log('⏳ Sincronização já em andamento...');
      }
      return { success: false, message: 'Sincronização já em andamento' };
    }

    const isConnected = await connectivityService.checkConnection();
    if (!isConnected) {
      return { success: false, message: 'Sem conexão com a internet' };
    }

    this.isSyncing = true;
    this.notifyListeners({ status: 'syncing', progress: 0 });

    try {
      const stats = await databaseService.getStats();
      const { pendingSync } = stats;

      if (pendingSync === 0) {
        this.notifyListeners({ status: 'success', progress: 100 });
        return { success: true, message: 'Nenhum dado pendente para sincronizar' };
      }

      // Sincroniza movimentações
      const result = await this.syncMovements();

      if (result.success) {
        this.notifyListeners({ status: 'success', progress: 100 });
      } else {
        this.notifyListeners({ status: 'error', progress: 0, error: result.message });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      this.notifyListeners({ status: 'error', progress: 0, error: errorMessage });
      return { success: false, message: errorMessage };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sincroniza movimentações pendentes
   */
  private async syncMovements(): Promise<SyncResult> {
    try {
      const pendingMovements = await databaseService.getPendingMovements();
      
      if (pendingMovements.length === 0) {
        return { success: true, message: 'Nenhuma movimentação pendente' };
      }

      const token = await authService.getAccessToken();
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      let synced = 0;
      let failed = 0;

      for (let i = 0; i < pendingMovements.length; i++) {
        const movement = pendingMovements[i];
        const progress = Math.round(((i + 1) / pendingMovements.length) * 100);
        
        this.notifyListeners({ status: 'syncing', progress });

        try {
          // Envia movimentação para o servidor
          const response = await fetch(`${API_BASE_URL}/movements`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              date: movement.date,
              farmId: movement.farmId,
              pastureId: movement.pastureId,
              eventId: movement.eventId,
              eventDetailId: movement.eventDetailId,
              comment: movement.comment,
            }),
          });

          if (response.ok) {
            const serverData = await response.json();
            // Marca como sincronizado no banco local
            await databaseService.markMovementAsSynced(
              movement.localId,
              serverData.movementId
            );
            synced++;
          } else {
            console.error(`Erro ao sincronizar movimentação ${movement.localId}:`, response.statusText);
            failed++;
          }
        } catch (error) {
          console.error(`Erro ao sincronizar movimentação ${movement.localId}:`, error);
          failed++;
        }
      }

      if (failed > 0) {
        return {
          success: false,
          message: `${synced} movimentações sincronizadas, ${failed} falharam`,
        };
      }

      return {
        success: true,
        message: `${synced} movimentações sincronizadas com sucesso`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao sincronizar movimentações';
      console.error('Erro na sincronização de movimentações:', error);
      return { success: false, message: errorMessage };
    }
  }

  /**
   * Adiciona listener para eventos de sincronização
   */
  addSyncListener(callback: (status: SyncStatus) => void) {
    this.syncListeners.add(callback);
    return () => {
      this.syncListeners.delete(callback);
    };
  }

  /**
   * Notifica listeners sobre mudanças no status de sincronização
   */
  private notifyListeners(status: SyncStatus) {
    this.syncListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Erro ao notificar listener de sincronização:', error);
      }
    });
  }

  /**
   * Verifica se está sincronizando
   */
  getIsSyncing(): boolean {
    return this.isSyncing;
  }
}

// Tipos
export interface SyncResult {
  success: boolean;
  message: string;
}

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'success' | 'error';
  progress: number;
  error?: string;
}

export default new SyncService();

