import express from "express";
import  { Request, Response,  } from "express";
import Project from "../models/Project";
import dotenv from "dotenv";
dotenv.config();
const router = express.Router();
export default router;
// Create a project
export const createProject = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!(req as any).user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { name, prompt, diagramType } = req.body;

    const project = new Project({
      name,
      prompt,
      diagramType,
      userId: (req as any).user._id,
    });

    console.log("Project", JSON.stringify(project));
    const savedProject = await project.save();
    res.status(201).json({ project: savedProject });
    console.log("Project successfully created ", project.name);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all projects for a user
export const getProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!(req as any).user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const projects = await Project.find({ userId: (req as any).user._id });
    res.status(200).json({ projects });
    console.log("Projects retrieved size ", projects.length);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Failed to fetch projects." });
  }
};

// Update a project
export const updateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, prompt, framework, diagramType } = req.body;

    if (!(req as any).user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const updatedProject = await Project.findOneAndUpdate(
      { _id: id, userId: (req as any).user._id },
      { name, description, prompt, framework, diagramType },
      { new: true }
    );

    if (!updatedProject) {
      res.status(404).json({ error: "Project not found or not authorized" });
      return;
    }

    res.status(200).json({ project: updatedProject });
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ error: "Failed to update project." });
  }
};

// Delete a project
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!(req as any).user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const deletedProject = await Project.findOneAndDelete({
      _id: id,
      userId: (req as any).user._id,
    });

    if (!deletedProject) {
      res.status(404).json({ error: "Project not found or not authorized" });
      return;
    }

    res.status(200).json({ message: "Project deleted successfully." });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ error: "Failed to delete project." });
  }
};

export const saveProjectState = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { lastPrompt, lastCode } = req.body;
  
      if (!(req as any).user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
  
      const updatedProject = await Project.findOneAndUpdate(
        { _id: id, userId: (req as any).user._id },
        { lastPrompt, lastCode },
        { new: true }
      );
  
      if (!updatedProject) {
        res.status(404).json({ error: "Project not found or not authorized" });
        return;
      }
  
      res.status(200).json({ project: updatedProject });
    } catch (error) {
      console.error("Error saving project state:", error);
      res.status(500).json({ error: "Failed to save project state." });
    }
  };

  export const getProjectById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const project = await Project.findById(id);
      console.log("Id", id);
      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }
  
      res.status(200).json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  };