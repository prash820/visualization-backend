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
exports.deployInfrastructure = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const saveIaCToFile = (projectId, iacCode) => {
    console.log("Saving IAC to file");
    const workspaceDir = path_1.default.join(__dirname, "../../terraform-runner/workspaces", projectId);
    if (!fs_1.default.existsSync(workspaceDir)) {
        fs_1.default.mkdirSync(workspaceDir, { recursive: true });
    }
    const filePath = path_1.default.join(workspaceDir, "main.tf");
    fs_1.default.writeFileSync(filePath, iacCode);
    return workspaceDir;
};
// ✅ Export this function
const deployInfrastructure = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { projectId, iacCode } = req.body;
    if (!projectId || !iacCode) {
        return res.status(400).json({ error: "Missing projectId or iacCode." });
    }
    try {
        saveIaCToFile(projectId, iacCode);
        const response = yield (0, node_fetch_1.default)("http://localhost:8000/deploy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId }),
        });
        const result = yield response.json();
        if (result.status === "success") {
            return res.status(200).json({ message: "Deployment successful", logs: result.stdout });
        }
        else {
            return res.status(500).json({ error: "Terraform failed", logs: result.stderr });
        }
    }
    catch (error) {
        console.error("Deployment error:", error);
        return res.status(500).json({ error: "Deployment failed." });
    }
});
exports.deployInfrastructure = deployInfrastructure;
