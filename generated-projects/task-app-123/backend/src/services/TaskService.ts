import Task from '../models/Task';

class TaskService {
  private tasks: Task[] = [];

  getAllTasks(): Promise<Task[]> {
    return Promise.resolve(this.tasks);
  }

  createTask(task: Task): Promise<Task> {
    this.tasks.push(task);
    return Promise.resolve(task);
  }

  updateTask(id: string, updatedTask: Task): Promise<Task | null> {
    const index = this.tasks.findIndex(task => task.id === id);
    if (index !== -1) {
      this.tasks[index] = updatedTask;
      return Promise.resolve(updatedTask);
    }
    return Promise.resolve(null);
  }

  deleteTask(id: string): Promise<void> {
    this.tasks = this.tasks.filter(task => task.id !== id);
    return Promise.resolve();
  }
}

export default new TaskService();