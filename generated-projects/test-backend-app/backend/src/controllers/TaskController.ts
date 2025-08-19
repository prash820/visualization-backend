// TaskController.tsx

import React, { useState, useEffect } from 'react';
import { Task, AppError, TaskStatus } from './types';
import { TaskService } from './TaskService';
import { handleAppError, createAppError } from './utils';
import { ERROR_CODES } from './constants';

interface TaskControllerProps {
  taskService: TaskService;
}

const TaskController: React.FC<TaskControllerProps> = ({ taskService }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<AppError | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    try {
      const allTasks = taskService.getTasksByStatus('todo'); // Example status
      setTasks(allTasks);
    } catch (err) {
      const appError = createAppError('Failed to fetch tasks', ERROR_CODES.GENERIC_ERROR);
      setError(appError);
      handleAppError(appError);
    }
  }, [taskService]);

  const handleSelectTask = (taskId: string) => {
    try {
      const task = taskService.getTaskById(taskId);
      if (!task) {
        throw createAppError('Task not found', ERROR_CODES.NOT_FOUND);
      }
      setSelectedTask(task);
    } catch (err) {
      const appError = err as AppError;
      setError(appError);
      handleAppError(appError);
    }
  };

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h1>Task Management</h1>
      <ul>
        {tasks.map(task => (
          <li key={task.id} onClick={() => handleSelectTask(task.id)}>
            {task.title} ({task.status})
          </li>
        ))}
      </ul>
      {selectedTask && (
        <div>
          <h2>Selected Task</h2>
          <p>Title: {selectedTask.title}</p>
          <p>Description: {selectedTask.description}</p>
          <p>Status: {selectedTask.status}</p>
        </div>
      )}
    </div>
  );
};

export default TaskController;
