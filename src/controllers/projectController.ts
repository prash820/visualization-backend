import express from "express";
import  { Request, Response,  } from "express";
import { getAllProjects, getProjectById, saveProject, deleteProject, Project } from "../utils/projectFileStore";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
dotenv.config();
const router = express.Router();
export default router;
// Create a project
export const createProject = async (req: Request, res: Response) => {
  const newProject: Project = {
    ...req.body,
    _id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  await saveProject(newProject);
  res.status(201).json(newProject);
};

// Get all projects for a user
export const getProjects = async (req: Request, res: Response) => {
  const projects = await getAllProjects();
  res.json(projects);
};

// Update a project
export const updateProject = async (req: Request, res: Response) => {
  const project = await getProjectById(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  console.log("Updating project", req.body);
  const updated: Project = { ...project, ...req.body };
  await saveProject(updated);
  res.json(updated);
};

// Delete a project
export const removeProject = async (req: Request, res: Response) => {
  await deleteProject(req.params.id);
  res.json({ message: "Project deleted" });
};

export const saveProjectState = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { prompt, lastCode } = req.body;

  const project = await getProjectById(id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  if (prompt !== undefined) project.prompt = prompt;
  project.lastCode = lastCode;
  await saveProject(project);

  res.status(200).json({ project });
};

export const getProject = async (req: Request, res: Response) => {
  const project = await getProjectById(req.params.id);
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(project);
};