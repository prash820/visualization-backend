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
// src/routes/diagrams.ts
const express_1 = __importDefault(require("express"));
const child_process_1 = require("child_process");
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const router = express_1.default.Router();
router.post("/", (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // We expect { code: string } in the request body -> the Python code from the user's project
        const { code } = req.body;
        if (!code) {
            console.log("[diagrams] No 'code' provided in request body.");
            return res.status(400).json({ error: "No Diagrams code provided." });
        }
        console.log(`[diagrams] Received code : ${code}`);
        const pyPath = "/Users/prashanthboovaragavan/Documents/visualization/visualization-backend/myvenv/bin/python";
        const python = (0, child_process_1.spawn)(pyPath, ["/Users/prashanthboovaragavan/Documents/visualization/visualization-backend/src/routes/diagram_executor.py"]); // Adjust path as needed
        let dataBuffer = [];
        let errorBuffer = "";
        python.stdout.on("data", (chunk) => dataBuffer.push(chunk));
        python.stderr.on("data", (chunk) => (errorBuffer += chunk.toString()));
        python.on("close", (exitCode) => {
            if (exitCode === 0) {
                const fileBuffer = Buffer.concat(dataBuffer);
                // We'll assume PNG for now. If you want user to specify PNG vs SVG, handle it
                res.type("image/png").send(fileBuffer);
            }
            else {
                console.error("Diagrams execution error:", errorBuffer);
                res.status(500).json({ error: errorBuffer || "Failed to generate diagram." });
            }
        });
        // Pipe user's code to the python script
        python.stdin.write(code);
        python.stdin.end();
    }
    catch (error) {
        console.error("Error in /api/render-diagrams route:", error);
        res.status(500).json({ error: error.message });
    }
})));
exports.default = router;
