// HomePage.tsx
import React from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import DataList from './DataList';
import DataForm from './DataForm';
import { CalculationHistoryEntry, OperationResult } from './types';
import { useApi } from './useApi';

interface HomePageProps {}

const HomePage: React.FC<HomePageProps> = () => {
  const { history, calculate, clearHistory, loading, error } = useApi();

  const handleFormSubmit = (result: OperationResult) => {
    Alert.alert('Calculation Result', `Result: ${result}`);
  };

  const handleClearHistory = async () => {
    try {
      await clearHistory();
      Alert.alert('Success', 'Calculation history cleared successfully!');
    } catch (err) {
      Alert.alert('Error', 'Failed to clear calculation history.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CalcEasy</Text>
      <DataForm onSubmit={handleFormSubmit} />
      <DataList history={history} loading={loading} error={error} onClearHistory={handleClearHistory} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});

export default HomePage;