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
// src/routes/graphviz.ts
const express_1 = __importDefault(require("express"));
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler")); // or "express-async-handler"
const child_process_1 = require("child_process");
const router = express_1.default.Router();
router.post("/", (0, asyncHandler_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { dotCode, outputFormat = "svg" } = req.body;
    if (!dotCode) {
        return res.status(400).json({ error: "dotCode is required" });
    }
    // The result of spawn needs to be handled in events, so we do not truly have an "await" scenario
    // but we can wrap it in a Promise if we want the function to be purely async:
    const svgOrPngBuffer = yield new Promise((resolve, reject) => {
        const dot = (0, child_process_1.spawn)("dot", [`-T${outputFormat}`]);
        const dataBuffer = [];
        let errorBuffer = "";
        dot.stdout.on("data", (chunk) => dataBuffer.push(chunk));
        dot.stderr.on("data", (chunk) => (errorBuffer += chunk.toString()));
        dot.on("close", (code) => {
            if (code === 0) {
                resolve(Buffer.concat(dataBuffer));
            }
            else {
                reject(errorBuffer || "Graphviz rendering error");
            }
        });
        dot.stdin.write(dotCode);
        dot.stdin.end();
    });
    if (outputFormat === "svg") {
        res.type("image/svg+xml").send(svgOrPngBuffer);
    }
    else if (outputFormat === "png") {
        res.type("image/png").send(svgOrPngBuffer);
    }
    else {
        res.status(400).json({ error: "Unsupported output format" });
    }
})));
exports.default = router;
