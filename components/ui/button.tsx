import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  children,
  onPress,
  variant = 'default',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getButtonStyle = (): ViewStyle => {
    const baseStyle = [styles.button];
    
    if (variant === 'default') {
      return {
        ...baseStyle[0],
        backgroundColor: disabled ? colors.placeholder : colors.primary,
      };
    }
    
    if (variant === 'outline') {
      return {
        ...baseStyle[0],
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: disabled ? colors.placeholder : colors.primary,
      };
    }
    
    return {
      ...baseStyle[0],
      backgroundColor: 'transparent',
    };
  };

  const getTextStyle = (): TextStyle => {
    if (variant === 'default') {
      return {
        ...styles.text,
        color: '#fff',
      };
    }
    
    return {
      ...styles.text,
      color: disabled ? colors.placeholder : colors.primary,
    };
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[getButtonStyle(), style]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'default' ? '#fff' : colors.primary} />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

