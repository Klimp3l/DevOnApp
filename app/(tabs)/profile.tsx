import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ConnectionIndicator } from '@/components/ConnectionIndicator';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth.context';
import databaseService from '@/services/database.service';

export default function ProfileScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { user, signOut } = useAuth();

    const handleLogout = () => {
        Alert.alert(
            'Sair',
            'Deseja realmente sair do aplicativo?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sair',
                    style: 'destructive',
                    onPress: async () => {
                        await signOut();
                    },
                },
            ]
        );
    };

    const handleClearData = () => {
        Alert.alert(
            'Limpar Dados',
            'Isso irá remover todos os dados salvos localmente, incluindo movimentações não sincronizadas. Tem certeza?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Limpar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await databaseService.clearAllData();
                            Alert.alert('Sucesso', 'Dados locais limpos com sucesso!');
                        } catch (error) {
                            Alert.alert('Erro', 'Não foi possível limpar os dados');
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Perfil</Text>
                <ConnectionIndicator />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* User Info Card */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.avatarText, { color: colors.primaryDark }]}>
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                    </View>
                    <Text style={[styles.userName, { color: colors.text }]}>
                        {user?.name || 'Usuário'}
                    </Text>
                    <Text style={[styles.userEmail, { color: colors.icon }]}>
                        {user?.email || 'email@example.com'}
                    </Text>
                </View>

                {/* Account Info */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Informações da Conta
                    </Text>

                    <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: colors.icon }]}>
                                Nome de Usuário
                            </Text>
                            <Text style={[styles.infoValue, { color: colors.text }]}>
                                {user?.username || '-'}
                            </Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: colors.icon }]}>
                                Email
                            </Text>
                            <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
                                {user?.email || '-'}
                            </Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: colors.icon }]}>
                                ID do Usuário
                            </Text>
                            <Text style={[styles.infoValue, { color: colors.text }]}>
                                {user?.userxId || '-'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* App Info */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Sobre o Aplicativo
                    </Text>

                    <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: colors.icon }]}>
                                Versão
                            </Text>
                            <Text style={[styles.infoValue, { color: colors.text }]}>
                                1.0.0
                            </Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: colors.icon }]}>
                                Modo
                            </Text>
                            <Text style={[styles.infoValue, { color: colors.text }]}>
                                Offline First
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Ações
                    </Text>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={handleClearData}
                    >
                        <Text style={[styles.actionText, { color: colors.text }]}>
                            🗑️ Limpar Dados Locais
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Logout Button */}
                <Button
                    onPress={handleLogout}
                    variant="outline"
                    style={[styles.logoutButton, { borderColor: colors.error }]}
                    textStyle={{ color: colors.error }}
                >
                    🚪 Sair do Aplicativo
                </Button>

                <Text style={[styles.footerText, { color: colors.placeholder }]}>
                    Devon App © 2025
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    card: {
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        marginBottom: 24,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    userName: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    infoCard: {
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    infoLabel: {
        fontSize: 14,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
        textAlign: 'right',
        marginLeft: 16,
    },
    divider: {
        height: 1,
    },
    actionButton: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        marginBottom: 12,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '500',
    },
    logoutButton: {
        marginBottom: 16,
    },
    footerText: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
    },
});

