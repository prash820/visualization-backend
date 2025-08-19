// LoginPage.tsx
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import AuthForm from './AuthForm';
import { useAuth } from './useAuth';
import Loading from './Loading';

interface LoginPageProps {}

const LoginPage: React.FC<LoginPageProps> = () => {
  const { user, loading, error } = useAuth();

  if (loading) {
    return <Loading message="Loading user information..." />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Freelance Project Manager</Text>
      {error && <Text style={styles.errorText}>{error}</Text>}
      <AuthForm />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#6200ee',
  },
  errorText: {
    fontSize: 16,
    color: '#e53935',
    marginBottom: 16,
  },
});

export default LoginPage;