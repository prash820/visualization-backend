import { Request, Response } from 'express';
import { ProjectService } from '../services/ProjectService';

export class ProjectController {
  static async createProject(req: Request, res: Response) {
    const project = await ProjectService.createProject(req.body);
    res.json(project);
  }
}