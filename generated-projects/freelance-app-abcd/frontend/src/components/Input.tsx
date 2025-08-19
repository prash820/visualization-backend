// Input.tsx
import React, { useState } from 'react';
import { StyleSheet, TextInput, View, Text } from 'react-native';

interface InputProps {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  secureTextEntry?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  placeholder = '',
  value,
  onChangeText,
  error,
  secureTextEntry = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, isFocused && styles.focusedInput, error && styles.errorInput]}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        secureTextEntry={secureTextEntry}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#333',
  },
  focusedInput: {
    borderColor: '#6200ee',
  },
  errorInput: {
    borderColor: '#e53935',
  },
  errorText: {
    fontSize: 12,
    color: '#e53935',
    marginTop: 4,
  },
});

export default Input;