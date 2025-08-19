// apiService.ts

import { UserService } from './UserService';
import { ProjectService } from './ProjectService';
import { TaskService } from './TaskService';
import { User, Project, Task, AppError } from './types';
import { createAppError, ERROR_CODES } from './constants';
import { handleAppError } from './utils';

export class ApiService {
  private userService: UserService;
  private projectService: ProjectService;
  private taskService: TaskService;

  constructor(users: User[], projects: Project[], tasks: Task[]) {
    this.userService = new UserService(users);
    this.projectService = new ProjectService(projects);
    this.taskService = new TaskService(tasks);
  }

  public getUserById(userId: string): User | null {
    try {
      return this.userService.getUserById(userId);
    } catch (error) {
      handleAppError(error as AppError);
      return null;
    }
  }

  public getProjectById(projectId: string): Project | null {
    try {
      return this.projectService.getProjectById(projectId);
    } catch (error) {
      handleAppError(error as AppError);
      return null;
    }
  }

  public getTaskById(taskId: string): Task | null {
    try {
      return this.taskService.getTaskById(taskId);
    } catch (error) {
      handleAppError(error as AppError);
      return null;
    }
  }

  public addUser(newUser: User): void {
    try {
      this.userService.addUser(newUser);
    } catch (error) {
      handleAppError(error as AppError);
    }
  }

  public addProject(newProject: Project): void {
    try {
      this.projectService.addProject(newProject);
    } catch (error) {
      handleAppError(error as AppError);
    }
  }

  public addTask(newTask: Task): void {
    try {
      this.taskService.addTask(newTask);
    } catch (error) {
      handleAppError(error as AppError);
    }
  }

  public updateUser(userId: string, updatedInfo: Partial<User>): void {
    try {
      this.userService.updateUser(userId, updatedInfo);
    } catch (error) {
      handleAppError(error as AppError);
    }
  }

  public updateProject(projectId: string, updatedInfo: Partial<Project>): void {
    try {
      this.projectService.updateProject(projectId, updatedInfo);
    } catch (error) {
      handleAppError(error as AppError);
    }
  }

  public updateTask(taskId: string, updatedInfo: Partial<Task>): void {
    try {
      this.taskService.updateTask(taskId, updatedInfo);
    } catch (error) {
      handleAppError(error as AppError);
    }
  }

  public deleteUser(userId: string): void {
    try {
      this.userService.deleteUser(userId);
    } catch (error) {
      handleAppError(error as AppError);
    }
  }

  public deleteProject(projectId: string): void {
    try {
      this.projectService.deleteProject(projectId);
    } catch (error) {
      handleAppError(error as AppError);
    }
  }

  public deleteTask(taskId: string): void {
    try {
      this.taskService.deleteTask(taskId);
    } catch (error) {
      handleAppError(error as AppError);
    }
  }
}

// Example usage
const users: User[] = [
  { id: '1', name: 'Alice', email: 'alice@example.com', role: 'freelancer' },
  { id: '2', name: 'Bob', email: 'bob@example.com', role: 'client' }
];

const projects: Project[] = [
  { id: '1', name: 'Project A', description: 'Description A', ownerId: '1', status: 'active' }
];

const tasks: Task[] = [
  { id: '1', title: 'Task 1', description: 'Task 1 description', projectId: '1', assigneeId: '1', status: 'todo' }
];

const apiService = new ApiService(users, projects, tasks);
const user = apiService.getUserById('1');
if (user) {
  console.log(`User found: ${user.name}`);
}

apiService.addUser({ id: '3', name: 'Charlie', email: 'charlie@example.com', role: 'admin' });
console.log(apiService.getUserById('3'));

apiService.updateUser('1', { name: 'Alice Updated' });
console.log(apiService.getUserById('1'));

apiService.deleteUser('2');
console.log(apiService.getUserById('2'));
