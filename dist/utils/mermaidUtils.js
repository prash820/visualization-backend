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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSvgFromMermaid = generateSvgFromMermaid;
const mermaid_cli_1 = require("@mermaid-js/mermaid-cli");
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
function generateSvgFromMermaid(mermaidCode) {
    return __awaiter(this, void 0, void 0, function* () {
        // Create temporary files for input and output
        const tempDir = (0, os_1.tmpdir)();
        const timestamp = Date.now();
        const inputFile = (0, path_1.join)(tempDir, `input-${timestamp}.mmd`);
        const outputFile = (0, path_1.join)(tempDir, `output-${timestamp}.svg`);
        try {
            // Write Mermaid code to temporary input file
            (0, fs_1.writeFileSync)(inputFile, mermaidCode);
            // Generate SVG using mermaid-cli with transparent background
            yield (0, mermaid_cli_1.run)(inputFile, outputFile, {
                puppeteerConfig: {
                    args: ['--no-sandbox'],
                    defaultViewport: {
                        width: 1200,
                        height: 800,
                        deviceScaleFactor: 1,
                    }
                }
            });
            // Read the generated SVG
            const svg = (0, fs_1.readFileSync)(outputFile, 'utf-8');
            return svg;
        }
        finally {
            // Clean up temporary files
            try {
                (0, fs_1.unlinkSync)(inputFile);
                (0, fs_1.unlinkSync)(outputFile);
            }
            catch (error) {
                console.error('Error cleaning up temporary files:', error);
            }
        }
    });
}
