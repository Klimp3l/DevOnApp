import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface SelectOption {
  label: string;
  value: string | number;
}

interface SelectProps {
  label?: string;
  value: string | number | null | undefined;
  onValueChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  style?: ViewStyle;
}

export function Select({
  label,
  value,
  onValueChange,
  options,
  placeholder = 'Selecione uma opção',
  disabled = false,
  error,
  style,
}: SelectProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      )}
      <View
        style={[
          styles.pickerContainer,
          {
            backgroundColor: colors.card,
            borderColor: error ? '#ef4444' : colors.border,
          },
          disabled && styles.disabled,
        ]}
      >
        <Picker
          selectedValue={value ?? ''}
          onValueChange={(itemValue) => {
            if (itemValue !== '') {
              onValueChange(itemValue);
            }
          }}
          enabled={!disabled}
          style={[styles.picker, { color: colors.text }]}
        >
          <Picker.Item label={placeholder} value="" />
          {options.map((option) => (
            <Picker.Item
              key={option.value}
              label={option.label}
              value={option.value}
            />
          ))}
        </Picker>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  disabled: {
    opacity: 0.5,
  },
  error: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
});


