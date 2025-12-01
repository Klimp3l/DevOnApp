import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'default' | 'destructive';
}

export function Alert({ children, variant = 'default' }: AlertProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const backgroundColor = variant === 'destructive' 
    ? 'rgba(239, 68, 68, 0.1)' 
    : 'rgba(164, 198, 57, 0.1)';

  const borderColor = variant === 'destructive' 
    ? colors.error 
    : colors.primary;

  return (
    <View style={[styles.alert, { backgroundColor, borderColor }]}>
      {children}
    </View>
  );
}

export function AlertDescription({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Text style={[styles.description, { color: colors.text }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  alert: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
});

