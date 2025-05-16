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
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
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
