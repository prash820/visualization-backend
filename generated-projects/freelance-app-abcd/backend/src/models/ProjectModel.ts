// ProjectModel
// ProjectModel.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import { useApi } from './useApi';
import { useAuth } from './useAuth';
import { Project, Task, User } from './types';
import DataForm from './DataForm';
import DataList from './DataList';
import Loading from './Loading';

interface ProjectModelProps {}

const ProjectModel: React.FC<ProjectModelProps> = () => {
  const { user, loading: authLoading, error: authError } = useAuth();
  const {
    projects,
    tasks,
    loading: apiLoading,
    error: apiError,
    loadProjects,
    createNewProject,
    addNewTask,
  } = useApi();

  const [userId, setUserId] = useState<string>(''); // Placeholder for user ID

  useEffect(() => {
    if (user) {
      setUserId(user.userId);
      loadProjects(user.userId);
    }
  }, [user, loadProjects]);

  const handleProjectCreated = (project: Project) => {
    Alert.alert('Success', `Project '${project.title}' created successfully!`);
  };

  const handleTaskAdded = (task: Task) => {
    Alert.alert('Success', `Task '${task.title}' added successfully!`);
  };

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

export default ProjectModel;