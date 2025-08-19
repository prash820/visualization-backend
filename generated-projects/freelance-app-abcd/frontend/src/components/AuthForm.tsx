// AuthForm.tsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import Button from './Button';
import Input from './Input';
import { useAuth } from './useAuth';

interface AuthFormProps {}

const AuthForm: React.FC<AuthFormProps> = () => {
  const { loginUser, signUpUser, error, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleAuth = useCallback(async () => {
    if (!email || !password) {
      setFormError('Email and password are required.');
      return;
    }
    try {
      if (isSignUp) {
        await signUpUser({ email, password });
        Alert.alert('Success', 'Account created successfully!');
      } else {
        await loginUser(email, password);
        Alert.alert('Success', 'You are now logged in!');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to authenticate.');
    }
  }, [email, password, isSignUp, loginUser, signUpUser]);

  return (
    <View style={styles.container}>
      <Input
        label="Email"
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        error={formError || error}
      />
      <Input
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={formError || error}
      />
      <Button
        title={isSignUp ? "Sign Up" : "Login"}
        onPress={handleAuth}
        loading={loading}
        disabled={loading}
      />
      <Button
        title={isSignUp ? "Switch to Login" : "Switch to Sign Up"}
        onPress={() => setIsSignUp(!isSignUp)}
        disabled={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
});

export default AuthForm;
