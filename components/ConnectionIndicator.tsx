import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useConnectivity } from '@/hooks/useConnectivity';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ConnectionIndicatorProps {
    style?: any;
}

export function ConnectionIndicator({ style }: ConnectionIndicatorProps) {
    const { isConnected } = useConnectivity();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    return (
        <View style={[styles.container, style]}>
            <View
                style={[
                    styles.dot,
                    {
                        backgroundColor: isConnected ? '#10b981' : '#ef4444',
                    },
                ]}
            />
            <Text
                style={[
                    styles.text,
                    {
                        color: colors.text,
                    },
                ]}
            >
                {isConnected ? 'Online' : 'Offline'}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    text: {
        fontSize: 12,
        fontWeight: '500',
    },
});

