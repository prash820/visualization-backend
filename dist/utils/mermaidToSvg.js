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
exports.mermaidToSvg = mermaidToSvg;
const child_process_1 = require("child_process");
const os_1 = require("os");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
function mermaidToSvg(mermaidCode) {
    return __awaiter(this, void 0, void 0, function* () {
        const tempDir = (0, os_1.tmpdir)();
        const mmdPath = path_1.default.join(tempDir, `diagram-${Date.now()}.mmd`);
        const svgPath = path_1.default.join(tempDir, `diagram-${Date.now()}.svg`);
        yield fs_1.promises.writeFile(mmdPath, mermaidCode, 'utf8');
        yield new Promise((resolve, reject) => {
            (0, child_process_1.execFile)('mmdc', ['-i', mmdPath, '-o', svgPath, '--quiet'], (error) => (error ? reject(error) : resolve(null)));
        });
        const svg = yield fs_1.promises.readFile(svgPath, 'utf8');
        yield fs_1.promises.unlink(mmdPath);
        yield fs_1.promises.unlink(svgPath);
        return svg;
    });
}
