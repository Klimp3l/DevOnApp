import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Text as RNText } from 'react-native';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/auth.context';

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { signIn, tenantAccounts, clearTenantSelection } = useAuth();
  
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTenantSelection, setIsTenantSelection] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [showTenantToast, setShowTenantToast] = useState(false);

  useEffect(() => {
    if (tenantAccounts && tenantAccounts.length > 0) {
      setIsTenantSelection(true);
      setError('');
      setShowTenantToast(true);

      const timeout = setTimeout(() => {
        setShowTenantToast(false);
      }, 5000);

      return () => clearTimeout(timeout);
    } else {
      setIsTenantSelection(false);
      setSelectedTenantId(null);
      setShowTenantToast(false);
    }
  }, [tenantAccounts]);

  const handleLogin = async () => {
    setError('');

    // Validação básica
    if (!login || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    
    try {
      await signIn({ login, password });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao fazer login. Verifique suas credenciais.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTenantSelect = async (tenantId: number) => {
    if (loading) return;

    setSelectedTenantId(tenantId);
    setError('');
    setLoading(true);

    try {
      await signIn({ login, password, tenantId });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro ao fazer login. Verifique suas credenciais.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackFromTenantSelection = () => {
    clearTenantSelection();
    setError('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {showTenantToast && (
        <View style={styles.toastContainer}>
          <RNText style={styles.toastTitle}>
            Você possui mais de uma conta vinculada ao seu usuário.
          </RNText>
          <RNText style={styles.toastDescription}>
            Selecione uma das contas para continuar o login.
          </RNText>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Card style={styles.card}>
            <CardHeader>
              {isTenantSelection && (
                <View style={styles.backRow}>
                  <TouchableOpacity
                    onPress={handleBackFromTenantSelection}
                    style={styles.backButton}
                    disabled={loading}
                  >
                    <RNText style={styles.backButtonText}>← Voltar</RNText>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.logoContainer}>
                <Image
                  source={require('@/assets/images/Logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <CardTitle>Bem-vindo de volta</CardTitle>
              <CardDescription>
              {isTenantSelection
                ? 'Selecione uma das contas para continuar o login'
                : 'Entre com seu usuário e senha para acessar sua conta'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!isTenantSelection && (
                <>
                  <Input
                    label="Email ou Nome de Usuário"
                    placeholder="exemplo@email.com ou exemplo"
                    value={login}
                    onChangeText={setLogin}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    editable={!loading}
                  />

                  <Input
                    label="Senha"
                    placeholder="••••••••"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </>
              )}

              {isTenantSelection && tenantAccounts && tenantAccounts.length > 0 && (
                <View style={styles.tenantContainer}>
                  <RNText style={[styles.tenantLabel, { color: colors.text }]}>
                    Selecione a conta
                  </RNText>
                  {tenantAccounts.map((tenant) => (
                    <TouchableOpacity
                      key={tenant.tenantId}
                      style={[
                        styles.tenantButton,
                        selectedTenantId === tenant.tenantId && {
                          borderColor: colors.primary,
                          backgroundColor: colors.primaryLight,
                        },
                      ]}
                      onPress={() => handleTenantSelect(tenant.tenantId)}
                      disabled={loading}
                    >
                      <RNText
                        style={[
                          styles.tenantButtonText,
                          {
                            color:
                              selectedTenantId === tenant.tenantId
                                ? colors.primaryDark
                                : colors.text,
                          },
                        ]}
                      >
                        {tenant.accountName}
                      </RNText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </CardContent>

            <CardFooter style={styles.footer}>
              {!isTenantSelection && (
                <Button
                  onPress={handleLogin}
                  disabled={loading}
                  loading={loading}
                  style={styles.button}
                >
                  Entrar
                </Button>
              )}

              {!isTenantSelection && (
                <TouchableOpacity 
                  style={styles.forgotPassword}
                  onPress={() => {
                    // TODO: Implementar recuperação de senha
                    console.log('Recuperar senha');
                  }}
                >
                  <RNText style={[styles.forgotPasswordText, { color: colors.primary }]}>
                    Esqueceu sua senha?
                  </RNText>
                </TouchableOpacity>
              )}
            </CardFooter>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toastContainer: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#facc15', // amarelo semelhante ao bg-yellow-500
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  toastDescription: {
    fontSize: 13,
    color: '#1f2937',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    width: '100%',
  },
  backRow: {
    marginBottom: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 200,
    height: 105,
  },
  footer: {
    flexDirection: 'column',
    gap: 16,
  },
  button: {
    width: '100%',
  },
  forgotPassword: {
    alignSelf: 'center',
    padding: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tenantContainer: {
    marginTop: 8,
  },
  tenantLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  tenantButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  tenantButtonText: {
    fontSize: 14,
  },
});

