// HomePage.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import DataList from './DataList';
import DataForm from './DataForm';
import { Project, Task } from './types';
import { useApi } from './useApi';

interface HomePageProps {}

const HomePage: React.FC<HomePageProps> = () => {
  const { projects, tasks, loadProjects, createNewProject, addNewTask, error, loading } = useApi();
  const [userId, setUserId] = useState<string>(''); // Placeholder for user ID

  useEffect(() => {
    // Load projects for the user on component mount
    if (userId) {
      loadProjects(userId);
    }
  }, [userId, loadProjects]);

  const handleProjectCreated = (project: Project) => {
    Alert.alert('Success', `Project '${project.title}' created successfully!`);
  };

  const handleTaskAdded = (task: Task) => {
    Alert.alert('Success', `Task '${task.title}' added successfully!`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Freelance Project Manager</Text>
      {error && <Text style={styles.errorText}>{error}</Text>}
      <DataForm userId={userId} onProjectCreated={handleProjectCreated} onTaskAdded={handleTaskAdded} />
      <DataList userId={userId} />
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
  errorText: {
    fontSize: 16,
    color: '#e53935',
    marginBottom: 16,
  },
});

export default HomePage;