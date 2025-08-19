// HomePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import DataList from './DataList';
import DataForm from './DataForm';
import { Project, Task } from './types';
import { useApi } from './useApi';
import { useAuth } from './useAuth';
import Loading from './Loading';

interface HomePageProps {}

const HomePage: React.FC<HomePageProps> = () => {
  const { user, loading: authLoading, error: authError } = useAuth();
  const { projects, tasks, loadProjects, createNewProject, addNewTask, error: apiError, loading: apiLoading } = useApi();
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    if (user) {
      setUserId(user.userId);
      loadProjects(user.userId);
    }
  }, [user, loadProjects]);

  const handleProjectCreated = useCallback((project: Project) => {
    Alert.alert('Success', `Project '${project.title}' created successfully!`);
  }, []);

  const handleTaskAdded = useCallback((task: Task) => {
    Alert.alert('Success', `Task '${task.title}' added successfully!`);
  }, []);

  if (authLoading || apiLoading) {
    return <Loading message="Loading data..." />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Freelance Project Manager</Text>
      {(authError || apiError) && <Text style={styles.errorText}>{authError || apiError}</Text>}
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