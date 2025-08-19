// ProjectController.ts
import { Request, Response } from 'express';
import { ProjectService } from '../services/ProjectService';
import { handleApiError } from '../utils';

class ProjectController {
  private projectService: ProjectService;

  constructor() {
    this.projectService = new ProjectService();
  }

  public async createProject(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, clientId, freelancerId } = req.body;
      const project = await this.projectService.createNewProject({
        title,
        description,
        clientId,
        freelancerId
      });
      res.status(201).json({ project });
    } catch (error) {
      const apiError = handleApiError(error);
      res.status(400).json({ error: apiError.message });
    }
  }

  public async getProjects(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string;
      const projects = await this.projectService.loadProjects(userId);
      res.status(200).json({ projects });
    } catch (error) {
      const apiError = handleApiError(error);
      res.status(404).json({ error: apiError.message });
    }
  }

  public async updateProject(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const updatedData = req.body;
      const updatedProject = await this.projectService.updateProject(projectId, updatedData);
      res.status(200).json({ updatedProject });
    } catch (error) {
      const apiError = handleApiError(error);
      res.status(400).json({ error: apiError.message });
    }
  }

  public async deleteProject(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      await this.projectService.removeProject(projectId);
      res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error) {
      const apiError = handleApiError(error);
      res.status(500).json({ error: apiError.message });
    }
  }
}

export default new ProjectController();
