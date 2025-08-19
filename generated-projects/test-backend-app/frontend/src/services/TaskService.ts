// TaskService
// TaskService.ts

import { Task, AppError, TaskStatus } from './types';
import { createAppError, ERROR_CODES } from './constants';
import { findTaskById, isTaskStatus, handleAppError } from './utils';

export class TaskService {
  private tasks: Task[];

  constructor(tasks: Task[]) {
    this.tasks = tasks;
  }

  public getTaskById(taskId: string): Task | null {
    try {
      const task = findTaskById(this.tasks, taskId);
      if (!task) {
        throw createAppError('Task not found', ERROR_CODES.NOT_FOUND);
      }
      return task;
    } catch (error) {
      handleAppError(error as AppError);
      return null;
    }
  }

  public getTasksByStatus(status: TaskStatus): Task[] {
    return this.tasks.filter(task => isTaskStatus(task, status));
  }

  public addTask(newTask: Task): void {
    if (this.tasks.some(task => task.id === newTask.id)) {
      handleAppError(createAppError('Task already exists', ERROR_CODES.GENERIC_ERROR));
      return;
    }
    this.tasks.push(newTask);
  }

  public updateTask(taskId: string, updatedInfo: Partial<Task>): void {
    try {
      const taskIndex = this.tasks.findIndex(task => task.id === taskId);
      if (taskIndex === -1) {
        throw createAppError('Task not found', ERROR_CODES.NOT_FOUND);
      }
      this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...updatedInfo };
    } catch (error) {
      handleAppError(error as AppError);
    }
  }

  public deleteTask(taskId: string): void {
    try {
      const taskIndex = this.tasks.findIndex(task => task.id === taskId);
      if (taskIndex === -1) {
        throw createAppError('Task not found', ERROR_CODES.NOT_FOUND);
      }
      this.tasks.splice(taskIndex, 1);
    } catch (error) {
      handleAppError(error as AppError);
    }
  }
}

// Example usage
const tasks: Task[] = [
  { id: '1', title: 'Task 1', description: 'Task 1 description', projectId: '1', assigneeId: '1', status: 'todo' },
  { id: '2', title: 'Task 2', description: 'Task 2 description', projectId: '2', assigneeId: '2', status: 'in-progress' }
];

const taskService = new TaskService(tasks);
const task = taskService.getTaskById('1');
if (task) {
  console.log(`Task found: ${task.title}`);
}

taskService.addTask({ id: '3', title: 'Task 3', description: 'Task 3 description', projectId: '3', assigneeId: '3', status: 'todo' });
console.log(taskService.getTasksByStatus('todo'));

taskService.updateTask('1', { title: 'Task 1 Updated' });
console.log(taskService.getTaskById('1'));

taskService.deleteTask('2');
console.log(taskService.getTaskById('2'));