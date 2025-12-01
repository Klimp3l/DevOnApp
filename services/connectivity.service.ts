import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

class ConnectivityService {
  private listeners: Set<(isConnected: boolean) => void> = new Set();
  private isConnected: boolean = true;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Monitora mudanças na conexão
    NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected ?? false;
      
      if (connected !== this.isConnected) {
        this.isConnected = connected;
        this.notifyListeners(connected);
        
        if (__DEV__) {
          console.log(`📶 Status de conexão: ${connected ? 'ONLINE' : 'OFFLINE'}`);
        }
      }
    });
  }

  /**
   * Verifica se está conectado à internet
   */
  async checkConnection(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      this.isConnected = state.isConnected ?? false;
      return this.isConnected;
    } catch (error) {
      console.error('Erro ao verificar conexão:', error);
      return false;
    }
  }

  /**
   * Obtém o estado atual da conexão
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Adiciona um listener para mudanças de conexão
   */
  addListener(callback: (isConnected: boolean) => void) {
    this.listeners.add(callback);
    
    // Retorna função para remover o listener
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notifica todos os listeners sobre mudança de conexão
   */
  private notifyListeners(isConnected: boolean) {
    this.listeners.forEach(listener => {
      try {
        listener(isConnected);
      } catch (error) {
        console.error('Erro ao notificar listener:', error);
      }
    });
  }
}

export default new ConnectivityService();

