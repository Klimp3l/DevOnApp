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
  reference: {
    farms: `${API_BASE_URL}/farms`,
    pastures: `${API_BASE_URL}/pastures`,
    events: `${API_BASE_URL}/events`,
    eventDetails: `${API_BASE_URL}/event-details`,
    breeds: `${API_BASE_URL}/breeds`,
    animalTypes: `${API_BASE_URL}/animal-types`,
    ageGroups: `${API_BASE_URL}/age-groups`,
    unitOfMeasures: `${API_BASE_URL}/unit-of-measures`,
  },
  movements: {
    homeDashboard: `${API_BASE_URL}/movements/home-dashboard`,
  },
  // Adicione outros endpoints conforme necessário
};

// Configurações de timeout
export const API_TIMEOUT = 30000; // 30 segundos

