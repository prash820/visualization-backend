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
exports.getProject = exports.saveProjectState = exports.removeProject = exports.updateProject = exports.getProjects = exports.createProject = void 0;
const express_1 = __importDefault(require("express"));
const projectFileStore_1 = require("../utils/projectFileStore");
const dotenv_1 = __importDefault(require("dotenv"));
const uuid_1 = require("uuid");
dotenv_1.default.config();
const router = express_1.default.Router();
exports.default = router;
// Create a project
const createProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const newProject = Object.assign(Object.assign({}, req.body), { _id: (0, uuid_1.v4)(), createdAt: new Date().toISOString() });
    yield (0, projectFileStore_1.saveProject)(newProject);
    res.status(201).json(newProject);
});
exports.createProject = createProject;
// Get all projects for a user
const getProjects = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const projects = yield (0, projectFileStore_1.getAllProjects)();
    res.json(projects);
});
exports.getProjects = getProjects;
// Update a project
const updateProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const project = yield (0, projectFileStore_1.getProjectById)(req.params.id);
    if (!project)
        return res.status(404).json({ error: "Project not found" });
    const updated = Object.assign(Object.assign({}, project), req.body);
    yield (0, projectFileStore_1.saveProject)(updated);
    res.json(updated);
});
exports.updateProject = updateProject;
// Delete a project
const removeProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, projectFileStore_1.deleteProject)(req.params.id);
    res.json({ message: "Project deleted" });
});
exports.removeProject = removeProject;
const saveProjectState = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { lastPrompt, lastCode } = req.body;
    const project = yield (0, projectFileStore_1.getProjectById)(id);
    if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
    }
    project.lastPrompt = lastPrompt;
    project.lastCode = lastCode;
    yield (0, projectFileStore_1.saveProject)(project);
    res.status(200).json({ project });
});
exports.saveProjectState = saveProjectState;
const getProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const project = yield (0, projectFileStore_1.getProjectById)(req.params.id);
    if (!project)
        return res.status(404).json({ error: "Project not found" });
    res.json(project);
});
exports.getProject = getProject;
