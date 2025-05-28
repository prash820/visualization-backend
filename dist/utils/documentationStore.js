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
exports.createDocumentation = createDocumentation;
exports.getDocumentationById = getDocumentationById;
exports.updateDocumentation = updateDocumentation;
exports.getDocumentationsByProjectId = getDocumentationsByProjectId;
exports.deleteDocumentation = deleteDocumentation;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const DATA_FILE = path_1.default.join(__dirname, "../../documentations.json");
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
function writeAll(documentations) {
    return __awaiter(this, void 0, void 0, function* () {
        yield promises_1.default.writeFile(DATA_FILE, JSON.stringify(documentations, null, 2));
    });
}
function createDocumentation(projectId, prompt, umlDiagrams) {
    return __awaiter(this, void 0, void 0, function* () {
        const documentations = yield readAll();
        const newDocumentation = {
            id: (0, uuid_1.v4)(),
            projectId,
            prompt,
            umlDiagrams,
            status: 'pending',
            progress: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        documentations.push(newDocumentation);
        yield writeAll(documentations);
        return newDocumentation;
    });
}
function getDocumentationById(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const documentations = yield readAll();
        return documentations.find(doc => doc.id === id) || null;
    });
}
function updateDocumentation(id, updates) {
    return __awaiter(this, void 0, void 0, function* () {
        const documentations = yield readAll();
        const index = documentations.findIndex(doc => doc.id === id);
        if (index === -1)
            return null;
        const updatedDoc = Object.assign(Object.assign(Object.assign({}, documentations[index]), updates), { updatedAt: new Date().toISOString() });
        documentations[index] = updatedDoc;
        yield writeAll(documentations);
        return updatedDoc;
    });
}
function getDocumentationsByProjectId(projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        const documentations = yield readAll();
        return documentations.filter(doc => doc.projectId === projectId);
    });
}
function deleteDocumentation(id) {
    return __awaiter(this, void 0, void 0, function* () {
        const documentations = yield readAll();
        const filteredDocs = documentations.filter(doc => doc.id !== id);
        if (filteredDocs.length === documentations.length) {
            return false;
        }
        yield writeAll(filteredDocs);
        return true;
    });
}
