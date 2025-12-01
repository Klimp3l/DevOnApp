import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '@/config/api';

// Tipos
export interface LoginRequest {
  login: string;
  password: string;
  tenantId?: number | null;
}

export interface LoginResponse {
  token?: string;
  refreshToken?: string;
  tenantAccounts?: TenantAccount[];
}

export interface TenantAccount {
  tenantId: number;
  accountName: string;
}

export interface UserInfo {
  userxId: number;
  name: string;
  email: string;
  username: string;
  [key: string]: any;
}

// Chaves do AsyncStorage
const STORAGE_KEYS = {
  ACCESS_TOKEN: '@devon:accessToken',
  REFRESH_TOKEN: '@devon:refreshToken',
  USER_INFO: '@devon:userInfo',
};

class AuthService {
  /**
   * Realiza o login do usuário
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.auth.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta do login:', errorText);
        throw new Error('Não foi possível autenticar. Verifique seus dados e tente novamente.');
      }

      const data: LoginResponse = await response.json();

      // Se tem múltiplos tenants, retorna para o usuário selecionar
      if (!data.token && data.tenantAccounts && data.tenantAccounts.length > 0) {
        return data;
      }

      // Se não tem token, erro genérico
      if (!data.token) {
        throw new Error('Token não recebido da API');
      }

      // Salva os tokens
      await this.saveTokens(data.token, data.refreshToken || '');

      // Busca e salva informações do usuário
      await this.fetchAndSaveUserInfo(data.token);

      return data;
    } catch (error) {
      console.error('Erro no login:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Não foi possível entrar agora. Tente novamente.');
    }
  }

  /**
   * Busca informações do usuário
   */
  async fetchAndSaveUserInfo(token: string): Promise<UserInfo> {
    try {
      const response = await fetch(API_ENDPOINTS.auth.userInfo, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar informações do usuário');
      }

      const userInfo: UserInfo = await response.json();
      await AsyncStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));

      return userInfo;
    } catch (error) {
      console.error('Erro ao buscar informações do usuário:', error);
      throw error;
    }
  }

  /**
   * Salva os tokens no AsyncStorage
   */
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
      ]);
    } catch (error) {
      console.error('Erro ao salvar tokens:', error);
      throw error;
    }
  }

  /**
   * Obtém o token de acesso
   */
  async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('Erro ao obter token de acesso:', error);
      return null;
    }
  }

  /**
   * Obtém o refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('Erro ao obter refresh token:', error);
      return null;
    }
  }

  /**
   * Obtém informações do usuário
   */
  async getUserInfo(): Promise<UserInfo | null> {
    try {
      const userInfoString = await AsyncStorage.getItem(STORAGE_KEYS.USER_INFO);
      return userInfoString ? JSON.parse(userInfoString) : null;
    } catch (error) {
      console.error('Erro ao obter informações do usuário:', error);
      return null;
    }
  }

  /**
   * Atualiza o token usando o refresh token
   */
  async refreshToken(): Promise<string> {
    try {
      const refreshToken = await this.getRefreshToken();
      
      if (!refreshToken) {
        throw new Error('Refresh token não encontrado');
      }

      const response = await fetch(API_ENDPOINTS.auth.refresh, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar token');
      }

      const data = await response.json();
      await this.saveTokens(data.token, data.refreshToken);

      return data.token;
    } catch (error) {
      console.error('Erro ao atualizar token:', error);
      throw error;
    }
  }

  /**
   * Realiza o logout do usuário
   */
  async logout(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_INFO,
      ]);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      throw error;
    }
  }

  /**
   * Verifica se o usuário está autenticado
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      return !!token;
    } catch (error) {
      return false;
    }
  }
}

export default new AuthService();

