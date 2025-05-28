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
exports.getAllProjects = getAllProjects;
exports.getProjectById = getProjectById;
exports.saveProject = saveProject;
exports.deleteProject = deleteProject;
exports.createOrUpdateProjectDocumentation = createOrUpdateProjectDocumentation;
exports.getProjectDocumentation = getProjectDocumentation;
exports.updateProjectDocumentation = updateProjectDocumentation;
exports.deleteProjectDocumentation = deleteProjectDocumentation;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const mermaidToSvg_1 = require("../utils/mermaidToSvg");
const DATA_FILE = path_1.default.join(__dirname, "../../projects.json");
function readAll() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const file = yield promises_1.default.readFile(DATA_FILE, "utf-8");
            return JSON.parse(file);
        }
        catch (_a) {
            return [];
        }
    });
}
function writeAll(projects) {
    return __awaiter(this, void 0, void 0, function* () {
        yield promises_1.default.writeFile(DATA_FILE, JSON.stringify(projects, null, 2), "utf-8");
    });
}
function getAllProjects() {
    return __awaiter(this, void 0, void 0, function* () {
        return readAll();
    });
}
function getProjectById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const projects = yield readAll();
        return projects.find(p => p._id === id);
    });
}
function saveProject(project) {
    return __awaiter(this, void 0, void 0, function* () {
        const projects = yield readAll();
        const idx = projects.findIndex(p => p._id === project._id);
        if (idx >= 0) {
            projects[idx] = project;
        }
        else {
            projects.push(project);
        }
        yield writeAll(projects);
    });
}
function deleteProject(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const projects = yield readAll();
        const filtered = projects.filter(p => p._id !== id);
        yield writeAll(filtered);
    });
}
function createOrUpdateProjectDocumentation(projectId, prompt, umlDiagrams) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const projects = yield readAll();
        const project = projects.find(p => p._id === projectId);
        if (!project)
            return null;
        const now = new Date().toISOString();
        const newDoc = {
            id: ((_a = project.documentation) === null || _a === void 0 ? void 0 : _a.id) || (0, uuid_1.v4)(),
            projectId,
            prompt,
            umlDiagrams,
            status: 'pending',
            progress: 0,
            createdAt: ((_b = project.documentation) === null || _b === void 0 ? void 0 : _b.createdAt) || now,
            updatedAt: now
        };
        project.documentation = newDoc;
        // Generate SVGs for each Mermaid diagram
        const umlDiagramsSvg = {};
        if (umlDiagrams && typeof umlDiagrams === 'object') {
            for (const [key, code] of Object.entries(umlDiagrams)) {
                if (typeof code === 'string') {
                    try {
                        umlDiagramsSvg[key] = yield (0, mermaidToSvg_1.mermaidToSvg)(code);
                    }
                    catch (e) {
                        console.error(`Failed to render SVG for ${key}:`, e);
                    }
                }
            }
        }
        project.umlDiagramsSvg = umlDiagramsSvg;
        yield saveProject(project);
        return project;
    });
}
function getProjectDocumentation(projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        const project = yield getProjectById(projectId);
        return project && project.documentation ? project.documentation : null;
    });
}
function updateProjectDocumentation(projectId, updates) {
    return __awaiter(this, void 0, void 0, function* () {
        const project = yield getProjectById(projectId);
        if (!project || !project.documentation)
            return null;
        project.documentation = Object.assign(Object.assign(Object.assign({}, project.documentation), updates), { updatedAt: new Date().toISOString() });
        yield saveProject(project);
        return project;
    });
}
function deleteProjectDocumentation(projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        const project = yield getProjectById(projectId);
        if (!project || !project.documentation)
            return false;
        project.documentation = undefined;
        yield saveProject(project);
        return true;
    });
}
