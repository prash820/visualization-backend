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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectById = exports.saveProjectState = exports.deleteProject = exports.updateProject = exports.getProjects = exports.createProject = void 0;
const express_1 = __importDefault(require("express"));
const Project_1 = __importDefault(require("../models/Project"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const router = express_1.default.Router();
exports.default = router;
// Create a project
const createProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const { name, prompt, diagramType } = req.body;
        const project = new Project_1.default({
            name,
            prompt,
            diagramType,
            userId: req.user._id,
        });
        console.log("Project", JSON.stringify(project));
        const savedProject = yield project.save();
        res.status(201).json({ project: savedProject });
        console.log("Project successfully created ", project.name);
    }
    catch (error) {
        console.error("Error creating project:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.createProject = createProject;
// Get all projects for a user
const getProjects = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const projects = yield Project_1.default.find({ userId: req.user._id });
        res.status(200).json({ projects });
        console.log("Projects retrieved size ", projects.length);
    }
    catch (error) {
        console.error("Error fetching projects:", error);
        res.status(500).json({ error: "Failed to fetch projects." });
    }
});
exports.getProjects = getProjects;
// Update a project
const updateProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, description, prompt, framework, diagramType } = req.body;
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const updatedProject = yield Project_1.default.findOneAndUpdate({ _id: id, userId: req.user._id }, { name, description, prompt, framework, diagramType }, { new: true });
        if (!updatedProject) {
            res.status(404).json({ error: "Project not found or not authorized" });
            return;
        }
        res.status(200).json({ project: updatedProject });
    }
    catch (error) {
        console.error("Error updating project:", error);
        res.status(500).json({ error: "Failed to update project." });
    }
});
exports.updateProject = updateProject;
// Delete a project
const deleteProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const deletedProject = yield Project_1.default.findOneAndDelete({
            _id: id,
            userId: req.user._id,
        });
        if (!deletedProject) {
            res.status(404).json({ error: "Project not found or not authorized" });
            return;
        }
        res.status(200).json({ message: "Project deleted successfully." });
    }
    catch (error) {
        console.error("Error deleting project:", error);
        res.status(500).json({ error: "Failed to delete project." });
    }
});
exports.deleteProject = deleteProject;
const saveProjectState = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { lastPrompt, lastCode } = req.body;
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const updatedProject = yield Project_1.default.findOneAndUpdate({ _id: id, userId: req.user._id }, { lastPrompt, lastCode }, { new: true });
        if (!updatedProject) {
            res.status(404).json({ error: "Project not found or not authorized" });
            return;
        }
        res.status(200).json({ project: updatedProject });
    }
    catch (error) {
        console.error("Error saving project state:", error);
        res.status(500).json({ error: "Failed to save project state." });
    }
});
exports.saveProjectState = saveProjectState;
const getProjectById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const project = yield Project_1.default.findById(id);
        console.log("Id", id);
        if (!project) {
            res.status(404).json({ error: "Project not found" });
            return;
        }
        res.status(200).json(project);
    }
    catch (error) {
        console.error("Error fetching project:", error);
        res.status(500).json({ error: "Failed to fetch project" });
    }
});
exports.getProjectById = getProjectById;
