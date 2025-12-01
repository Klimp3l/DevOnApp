import { useState, useEffect } from 'react';
import connectivityService from '@/services/connectivity.service';

/**
 * Hook para monitorar o status de conectividade
 */
export function useConnectivity() {
  const [isConnected, setIsConnected] = useState(true);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Verifica conexão inicial
    checkInitialConnection();

    // Adiciona listener para mudanças
    const unsubscribe = connectivityService.addListener((connected) => {
      setIsConnected(connected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  async function checkInitialConnection() {
    try {
      const connected = await connectivityService.checkConnection();
      setIsConnected(connected);
    } catch (error) {
      console.error('Erro ao verificar conexão inicial:', error);
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  }

  return { isConnected, isChecking };
}

