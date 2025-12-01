/**
 * Configuração da API
 * 
 * A URL da API é carregada das variáveis de ambiente.
 * Configure no arquivo .env na raiz do projeto:
 * 
 * EXPO_PUBLIC_API_BASE_URL=https://sua-api.com
 */

import Constants from 'expo-constants';

// Obtém a URL da API das variáveis de ambiente
// Prioridade: EXPO_PUBLIC_API_BASE_URL > extra.apiBaseUrl > fallback
export const API_BASE_URL = 
  process.env.EXPO_PUBLIC_API_BASE_URL || 
  Constants.expoConfig?.extra?.apiBaseUrl || 
  'http://localhost:3000';

// Log da URL carregada (útil para debug)
if (__DEV__) {
  console.log('🌐 API Base URL:', API_BASE_URL);
}

// Endpoints da API
export const API_ENDPOINTS = {
  auth: {
    login: `${API_BASE_URL}/auth/login`,
    refresh: `${API_BASE_URL}/auth/refresh`,
    userInfo: `${API_BASE_URL}/app/user/info`,
  },
  // Adicione outros endpoints conforme necessário
};

// Configurações de timeout
export const API_TIMEOUT = 30000; // 30 segundos

