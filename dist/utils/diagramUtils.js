"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeSpecialCharsInNodes = void 0;
const encodeSpecialCharsInNodes = (diagram) => {
    // Regex to find text within nodes (inside [], {}, or ())
    const nodeRegex = /(\[.*?\]|\{.*?\}|\(.*?\))/g;
    return diagram.replace(nodeRegex, (match) => {
        // Skip encoding for logical operators and array syntax
        return match
            .replace(/&(?!(lt|gt|amp);)/g, "&amp;") // Encode & only if it's not already encoded
            .replace(/</g, "<") // Leave < unencoded
            .replace(/>/g, ">") // Leave > unencoded
            .replace(/"/g, "&quot;") // Encode double quotes
            .replace(/'/g, "&#39;"); // Encode single quotes
    });
};
exports.encodeSpecialCharsInNodes = encodeSpecialCharsInNodes;
