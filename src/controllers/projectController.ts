import { Request, Response } from "express";
import { databaseService, Project } from "../services/databaseService";
import { v4 as uuidv4 } from "uuid";

// Create a new project
export const createProject = async (req: Request, res: Response): Promise<void> => {
  const { name, description, userId } = req.body;
  
  if (!name || !userId) {
    res.status(400).json({ error: "Name and userId are required" });
    return;
  }

  const now = new Date().toISOString();
  const project: Project = {
    id: uuidv4(),
    name,
    description,
    userId,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    lastAccessed: now
  };

  try {
    databaseService.saveProject(project);
    res.json({ success: true, project });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: "Failed to create project" });
  }
};

// Get all projects for a user
export const getUserProjects = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  try {
    const projects = databaseService.getProjectsByUserId(userId);
    res.json({ projects });
  } catch (error) {
    console.error('Error getting user projects:', error);
    res.status(500).json({ error: "Failed to get projects" });
  }
};

// Get a specific project
export const getProject = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.params;
  
  if (!projectId) {
    res.status(400).json({ error: "projectId is required" });
    return;
  }

  try {
    const project = databaseService.getProject(projectId);
    
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json({ project });
  } catch (error) {
    console.error('Error getting project:', error);
    res.status(500).json({ error: "Failed to get project" });
  }
};

// Update a project
export const updateProject = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.params;
  const { name, description, status } = req.body;
  
  if (!projectId) {
    res.status(400).json({ error: "projectId is required" });
    return;
  }

  try {
    const project = databaseService.getProject(projectId);
    
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // Update fields
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (status) project.status = status;
    
    project.updatedAt = new Date().toISOString();
    project.lastAccessed = new Date().toISOString();

    databaseService.saveProject(project);
    res.json({ success: true, project });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: "Failed to update project" });
  }
};

// Delete a project
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.params;
  
  if (!projectId) {
    res.status(400).json({ error: "projectId is required" });
    return;
  }

  try {
    const project = databaseService.getProject(projectId);
    
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    databaseService.deleteProject(projectId);
    res.json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: "Failed to delete project" });
  }
};

// Archive a project
export const archiveProject = async (req: Request, res: Response): Promise<void> => {
  const { projectId } = req.params;
  
  if (!projectId) {
    res.status(400).json({ error: "projectId is required" });
    return;
  }

  try {
    databaseService.updateProjectStatus(projectId, 'archived');
    res.json({ success: true, message: "Project archived successfully" });
  } catch (error) {
    console.error('Error archiving project:', error);
    res.status(500).json({ error: "Failed to archive project" });
  }
};