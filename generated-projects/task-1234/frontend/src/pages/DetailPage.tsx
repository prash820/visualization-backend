// DetailPage.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import DataForm from './DataForm';
import Button from './Button';
import { Project, Task } from './types';
import { useApi } from './useApi';

interface DetailPageProps {
  projectId: string;
  onBack: () => void;
}

const DetailPage: React.FC<DetailPageProps> = ({ projectId, onBack }) => {
  const { projects, updateProject, removeProject, loadTasks, tasks, error, loading } = useApi();
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      loadTasks(projectId);
    }
  }, [projectId, loadTasks]);

  const project = projects.find((p) => p.projectId === projectId);

  if (!project) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Project not found.</Text>
      </View>
    );
  }

  const handleFormSubmit = useCallback(async (updatedProject: Project) => {
    try {
      await updateProject(projectId, updatedProject);
      Alert.alert('Success', 'Project updated successfully!');
      onBack();
    } catch (err) {
      setFormError('Failed to update project.');
    }
  }, [projectId, updateProject, onBack]);

  const handleDelete = useCallback(async () => {
    try {
      await removeProject(projectId);
      Alert.alert('Success', 'Project deleted successfully!');
      onBack();
    } catch (err) {
      setFormError('Failed to delete project.');
    }
  }, [projectId, removeProject, onBack]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Project</Text>
      {formError && <Text style={styles.errorText}>{formError}</Text>}
      {error && <Text style={styles.errorText}>{error}</Text>}
      <DataForm project={project} onSubmit={handleFormSubmit} />
      <View style={styles.buttonContainer}>
        <Button title="Delete Project" onPress={handleDelete} disabled={loading} />
        <Button title="Back" onPress={onBack} disabled={loading} />
      </View>
      <View style={styles.taskListContainer}>
        {tasks.map((task: Task) => (
          <View key={task.taskId} style={styles.taskContainer}>
            <Text style={styles.taskText}>{task.title} - {task.status}</Text>
          </View>
        ))}
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#e53935',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  taskListContainer: {
    marginTop: 16,
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
});

export default DetailPage;