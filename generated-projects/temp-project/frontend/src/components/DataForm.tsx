// DataForm.tsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import Button from './Button';
import Input from './Input';
import { useApi } from './useApi';
import { Project, Task } from './types';

interface DataFormProps {
  userId: string;
  onProjectCreated: (project: Project) => void;
  onTaskAdded: (task: Task) => void;
}

const DataForm: React.FC<DataFormProps> = ({ userId, onProjectCreated, onTaskAdded }) => {
  const { createNewProject, addNewTask } = useApi();
  const [projectTitle, setProjectTitle] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreateProject = useCallback(async () => {
    if (!projectTitle) {
      setFormError('Project title is required.');
      return;
    }
    try {
      const newProject = await createNewProject({ title: projectTitle, clientId: userId });
      onProjectCreated(newProject);
      Alert.alert('Success', 'Project created successfully!');
      setProjectTitle('');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create project.');
    }
  }, [projectTitle, userId, createNewProject, onProjectCreated]);

  const handleAddTask = useCallback(async () => {
    if (!taskTitle) {
      setFormError('Task title is required.');
      return;
    }
    try {
      const newTask = await addNewTask({ title: taskTitle, projectId: userId });
      onTaskAdded(newTask);
      Alert.alert('Success', 'Task added successfully!');
      setTaskTitle('');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to add task.');
    }
  }, [taskTitle, userId, addNewTask, onTaskAdded]);

  return (
    <View style={styles.container}>
      <Input
        label="Project Title"
        placeholder="Enter project title"
        value={projectTitle}
        onChangeText={setProjectTitle}
        error={formError}
      />
      <Button
        title="Create Project"
        onPress={handleCreateProject}
      />
      <Input
        label="Task Title"
        placeholder="Enter task title"
        value={taskTitle}
        onChangeText={setTaskTitle}
        error={formError}
      />
      <Button
        title="Add Task"
        onPress={handleAddTask}
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

export default DataForm;
