"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.archiveProject = exports.deleteProject = exports.updateProject = exports.getProject = exports.getUserProjects = exports.createProject = void 0;
const databaseService_1 = require("../services/databaseService");
const uuid_1 = require("uuid");
// Create a new project
const createProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, description, userId } = req.body;
    if (!name || !userId) {
        res.status(400).json({ error: "Name and userId are required" });
        return;
    }
    const now = new Date().toISOString();
    const project = {
        id: (0, uuid_1.v4)(),
        name,
        description,
        userId,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        lastAccessed: now
    };
    try {
        databaseService_1.databaseService.saveProject(project);
        res.json({ success: true, project });
    }
    catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: "Failed to create project" });
    }
});
exports.createProject = createProject;
// Get all projects for a user
const getUserProjects = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    if (!userId) {
        res.status(400).json({ error: "userId is required" });
        return;
    }
    try {
        const projects = databaseService_1.databaseService.getProjectsByUserId(userId);
        res.json({ projects });
    }
    catch (error) {
        console.error('Error getting user projects:', error);
        res.status(500).json({ error: "Failed to get projects" });
    }
});
exports.getUserProjects = getUserProjects;
// Get a specific project
const getProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    if (!projectId) {
        res.status(400).json({ error: "projectId is required" });
        return;
    }
    try {
        const project = databaseService_1.databaseService.getProject(projectId);
        if (!project) {
            res.status(404).json({ error: "Project not found" });
            return;
        }
        res.json({ project });
    }
    catch (error) {
        console.error('Error getting project:', error);
        res.status(500).json({ error: "Failed to get project" });
    }
});
exports.getProject = getProject;
// Update a project
const updateProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    const { name, description, status } = req.body;
    if (!projectId) {
        res.status(400).json({ error: "projectId is required" });
        return;
    }
    try {
        const project = databaseService_1.databaseService.getProject(projectId);
        if (!project) {
            res.status(404).json({ error: "Project not found" });
            return;
        }
        // Update fields
        if (name)
            project.name = name;
        if (description !== undefined)
            project.description = description;
        if (status)
            project.status = status;
        project.updatedAt = new Date().toISOString();
        project.lastAccessed = new Date().toISOString();
        databaseService_1.databaseService.saveProject(project);
        res.json({ success: true, project });
    }
    catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: "Failed to update project" });
    }
});
exports.updateProject = updateProject;
// Delete a project
const deleteProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    if (!projectId) {
        res.status(400).json({ error: "projectId is required" });
        return;
    }
    try {
        const project = databaseService_1.databaseService.getProject(projectId);
        if (!project) {
            res.status(404).json({ error: "Project not found" });
            return;
        }
        databaseService_1.databaseService.deleteProject(projectId);
        res.json({ success: true, message: "Project deleted successfully" });
    }
    catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: "Failed to delete project" });
    }
});
exports.deleteProject = deleteProject;
// Archive a project
const archiveProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId } = req.params;
    if (!projectId) {
        res.status(400).json({ error: "projectId is required" });
        return;
    }
    try {
        databaseService_1.databaseService.updateProjectStatus(projectId, 'archived');
        res.json({ success: true, message: "Project archived successfully" });
    }
    catch (error) {
        console.error('Error archiving project:', error);
        res.status(500).json({ error: "Failed to archive project" });
    }
});
exports.archiveProject = archiveProject;
