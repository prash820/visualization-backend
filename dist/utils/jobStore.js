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
exports.saveJob = saveJob;
exports.getJobById = getJobById;
exports.updateJob = updateJob;
exports.deleteJob = deleteJob;
exports.listJobs = listJobs;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const JOBS_DIR = path_1.default.join(process.cwd(), 'jobs');
// Ensure jobs directory exists
if (!fs_1.default.existsSync(JOBS_DIR)) {
    fs_1.default.mkdirSync(JOBS_DIR, { recursive: true });
}
function saveJob(job) {
    return __awaiter(this, void 0, void 0, function* () {
        const filePath = path_1.default.join(JOBS_DIR, `${job.id}.json`);
        yield fs_1.default.promises.writeFile(filePath, JSON.stringify(job, null, 2));
    });
}
function getJobById(jobId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const filePath = path_1.default.join(JOBS_DIR, `${jobId}.json`);
            const data = yield fs_1.default.promises.readFile(filePath, 'utf-8');
            return JSON.parse(data);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    });
}
function updateJob(jobId, updates) {
    return __awaiter(this, void 0, void 0, function* () {
        const job = yield getJobById(jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }
        const updatedJob = Object.assign(Object.assign({}, job), updates);
        yield saveJob(updatedJob);
    });
}
function deleteJob(jobId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const filePath = path_1.default.join(JOBS_DIR, `${jobId}.json`);
            yield fs_1.default.promises.unlink(filePath);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return;
            }
            throw error;
        }
    });
}
function listJobs(projectId) {
    return __awaiter(this, void 0, void 0, function* () {
        const files = yield fs_1.default.promises.readdir(JOBS_DIR);
        const jobs = [];
        for (const file of files) {
            if (file.endsWith('.json')) {
                const data = yield fs_1.default.promises.readFile(path_1.default.join(JOBS_DIR, file), 'utf-8');
                const job = JSON.parse(data);
                if (!projectId || job.projectId === projectId) {
                    jobs.push(job);
                }
            }
        }
        return jobs;
    });
}
