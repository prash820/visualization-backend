// DataList.tsx
import React from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { CalculationHistoryEntry } from './types';
import Loading from './Loading';
import { useApi } from './useApi';
import Button from './Button';

interface DataListProps {}

const DataList: React.FC<DataListProps> = () => {
  const { history, loading, error, clearHistory } = useApi();

  const handleClearHistory = async () => {
    try {
      await clearHistory();
      Alert.alert('Success', 'Calculation history cleared successfully!');
    } catch (err) {
      Alert.alert('Error', 'Failed to clear calculation history.');
    }
  };

  if (loading) {
    return <Loading message="Loading calculation history..." />;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={history}
      keyExtractor={(item, index) => index.toString()}
      renderItem={({ item }) => (
        <View style={styles.historyItemContainer}>
          <Text style={styles.historyText}>
            {`${item.operation.operand1} ${item.operation.operator} ${item.operation.operand2} = ${item.result}`}
          </Text>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No calculation history available.</Text>
        </View>
      }
      ListFooterComponent={
        <Button title="Clear History" onPress={handleClearHistory} />
      }
    />
  );
};

const styles = StyleSheet.create({
  historyItemContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  historyText: {
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#e53935',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default DataList;
