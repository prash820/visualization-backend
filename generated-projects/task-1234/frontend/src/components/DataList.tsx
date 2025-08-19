// DataList.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { Project, Task, Message } from './types';
import Loading from './Loading';
import { useApi } from './useApi';
import Button from './Button';

interface DataListProps {
  userId: string;
}

const DataList: React.FC<DataListProps> = ({ userId }) => {
  const {
    projects,
    tasks,
    messages,
    loading,
    error,
    loadProjects,
    loadTasks,
    loadMessages,
  } = useApi();

  useEffect(() => {
    loadProjects(userId);
  }, [userId, loadProjects]);

  const handleLoadTasks = async (projectId: string) => {
    try {
      await loadTasks(projectId);
    } catch (err) {
      Alert.alert('Error', 'Failed to load tasks.');
    }
  };

  const handleLoadMessages = async (projectId: string) => {
    try {
      await loadMessages(projectId);
    } catch (err) {
      Alert.alert('Error', 'Failed to load messages.');
    }
  };

  if (loading) {
    return <Loading message="Loading data..." />;
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
      data={projects}
      keyExtractor={(item) => item.projectId}
      renderItem={({ item }) => (
        <View style={styles.projectContainer}>
          <Text style={styles.projectTitle}>{item.title}</Text>
          <Button title="Load Tasks" onPress={() => handleLoadTasks(item.projectId)} />
          <Button title="Load Messages" onPress={() => handleLoadMessages(item.projectId)} />
          <FlatList
            data={tasks.filter((task) => task.projectId === item.projectId)}
            keyExtractor={(task) => task.taskId}
            renderItem={({ item: task }) => (
              <View style={styles.taskContainer}>
                <Text style={styles.taskText}>{task.title} - {task.status}</Text>
              </View>
            )}
          />
          <FlatList
            data={messages.filter((message) => message.projectId === item.projectId)}
            keyExtractor={(message) => message.messageId}
            renderItem={({ item: message }) => (
              <View style={styles.messageContainer}>
                <Text style={styles.messageText}>{message.content}</Text>
              </View>
            )}
          />
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No projects available.</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  projectContainer: {
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
  projectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  taskContainer: {
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    marginBottom: 4,
  },
  taskText: {
    fontSize: 14,
    color: '#555',
  },
  messageContainer: {
    padding: 8,
    backgroundColor: '#e9e9e9',
    borderRadius: 4,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#555',
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
