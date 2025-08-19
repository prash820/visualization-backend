// TaskModel.tsx

import React, { useState, useEffect } from 'react';
import { Task, AppError, TaskStatus } from './types';
import { findTaskById, handleAppError } from './utils';
import { createAppError, ERROR_CODES } from './constants';

interface TaskModelProps {
  tasks: Task[];
  taskId: string;
}

const TaskModel: React.FC<TaskModelProps> = ({ tasks, taskId }) => {
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    try {
      const foundTask = findTaskById(tasks, taskId);
      if (!foundTask) {
        throw createAppError('Task not found', ERROR_CODES.NOT_FOUND);
      }
      setTask(foundTask);
    } catch (err) {
      setError(err as AppError);
      handleAppError(err as AppError);
    }
  }, [tasks, taskId]);

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!task) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Task Details</h1>
      <p>Title: {task.title}</p>
      <p>Description: {task.description}</p>
      <p>Status: {task.status}</p>
    </div>
  );
};

export default TaskModel;
