import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { router } from 'expo-router';
import authService, { UserInfo, LoginRequest, TenantAccount } from '@/services/auth.service';
import databaseService from '@/services/database.service';
import connectivityService from '@/services/connectivity.service';
import referenceService from '@/services/reference.service';

interface AuthContextData {
  user: UserInfo | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (credentials: LoginRequest) => Promise<void>;
  signOut: () => Promise<void>;
  tenantAccounts: TenantAccount[] | null;
  clearTenantSelection: () => void;
  canAccessOffline: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenantAccounts, setTenantAccounts] = useState<TenantAccount[] | null>(null);
  const [canAccessOffline, setCanAccessOffline] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  async function initializeApp() {
    try {
      // Inicializa o banco de dados
      await databaseService.initialize();

      // Carrega dados armazenados
      await loadStoredData();
    } catch (error) {
      console.error('Erro ao inicializar app:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStoredData() {
    try {
      const [storedUser, isAuth, isConnected] = await Promise.all([
        authService.getUserInfo(),
        authService.isAuthenticated(),
        connectivityService.checkConnection(),
      ]);

      if (isAuth && storedUser) {
        setUser(storedUser);
        setCanAccessOffline(true);

        // Se estiver offline mas tem dados locais, permite acesso
        if (!isConnected) {
          if (__DEV__) {
            console.log('📴 Modo offline: Permitindo acesso com dados locais');
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados armazenados:', error);
    }
  }

  async function signIn(credentials: LoginRequest) {
    try {
      // Verifica conexão
      const isConnected = await connectivityService.checkConnection();

      if (!isConnected) {
        // Se estiver offline, verifica se tem dados locais válidos
        const storedUser = await authService.getUserInfo();
        if (storedUser && canAccessOffline) {
          // Permite acesso offline
          setUser(storedUser);
          router.replace('/(tabs)');
          return;
        } else {
          throw new Error('Você está offline. Conecte-se à internet para fazer login.');
        }
      }

      // Tenta fazer login online
      const response = await authService.login(credentials);

      // Caso 2: múltiplos tenants -> pedir seleção (sem token ainda)
      if (response.tenantAccounts && response.tenantAccounts.length > 0 && !response.token) {
        setTenantAccounts(response.tenantAccounts);
        return;
      }

      // Caso 1 (ou segunda tentativa do Caso 2): já temos o token, concluir login
      const userInfo = await authService.getUserInfo();
      setUser(userInfo);
      setTenantAccounts(null);
      setCanAccessOffline(true);

      // Salva dados do usuário localmente para acesso offline futuro
      if (userInfo) {
        // Algumas APIs podem não retornar "username"; evitamos quebrar o SQLite
        const safeUsername =
          (userInfo as any).username ??
          (userInfo as any).userName ??
          (userInfo as any).login ??
          userInfo.email ??
          userInfo.name ??
          '';

        if (!safeUsername && __DEV__) {
          console.warn(
            'Username não encontrado em userInfo. Usando valor vazio apenas para cache local.'
          );
        }

        await databaseService.saveUserData({
          userxId: userInfo.userxId,
          name: userInfo.name || '',
          email: userInfo.email || '',
          username: safeUsername,
          data: JSON.stringify(userInfo),
          lastSync: new Date().toISOString(),
        });

        // Carrega dados de referência para uso offline
        if (__DEV__) {
          console.log('📦 Carregando dados de referência...');
        }

        try {
          await referenceService.loadAllReferenceData();

          if (__DEV__) {
            console.log('✅ Dados de referência carregados com sucesso');
          }
        } catch (error) {
          // Não bloqueia o login se houver erro ao carregar dados de referência
          console.error('⚠️ Erro ao carregar dados de referência:', error);

          if (__DEV__) {
            console.warn('O usuário poderá fazer login, mas alguns dados podem não estar disponíveis offline');
          }
        }
      }

      // Redireciona para a tela principal
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Erro no signIn:', error);
      throw error;
    }
  }

  async function signOut() {
    try {
      await authService.logout();

      // Limpa dados locais do usuário (mas mantém movimentações para sincronizar depois)
      if (user) {
        await databaseService.clearUserData(user.userxId);
      }

      // Limpa dados de referência em cache
      await referenceService.clearCache();

      setUser(null);
      setTenantAccounts(null);
      setCanAccessOffline(false);
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      throw error;
    }
  }

  function clearTenantSelection() {
    setTenantAccounts(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        signIn,
        signOut,
        tenantAccounts,
        clearTenantSelection,
        canAccessOffline,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  return context;
}

