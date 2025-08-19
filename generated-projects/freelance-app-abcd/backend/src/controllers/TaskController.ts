// TaskController.ts
import { Request, Response } from 'express';
import { TaskService } from '../services/TaskService';
import { handleApiError } from '../utils';

class TaskController {
  private taskService: TaskService;

  constructor() {
    this.taskService = new TaskService();
  }

  public async createTask(req: Request, res: Response): Promise<void> {
    try {
      const { title, projectId } = req.body;
      const task = await this.taskService.addNewTask({ title, projectId });
      res.status(201).json({ task });
    } catch (error) {
      const apiError = handleApiError(error);
      res.status(400).json({ error: apiError.message });
    }
  }

  public async getTasks(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.query.projectId as string;
      const tasks = await this.taskService.loadTasks(projectId);
      res.status(200).json({ tasks });
    } catch (error) {
      const apiError = handleApiError(error);
      res.status(404).json({ error: apiError.message });
    }
  }

  public async completeTask(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;
      await this.taskService.completeTask(taskId);
      res.status(200).json({ message: 'Task marked as complete' });
    } catch (error) {
      const apiError = handleApiError(error);
      res.status(400).json({ error: apiError.message });
    }
  }

  public async deleteTask(req: Request, res: Response): Promise<void> {
    try {
      const { taskId } = req.params;
      await this.taskService.removeTask(taskId);
      res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
      const apiError = handleApiError(error);
      res.status(500).json({ error: apiError.message });
    }
  }
}

export default new TaskController();
