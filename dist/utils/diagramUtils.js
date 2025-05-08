"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeSpecialCharsInNodes = void 0;
const encodeSpecialCharsInNodes = (diagram) => {
    const nodeRegex = /(\[.*?\]|\{.*?\}|\(.*?\))/g;
    return diagram.replace(nodeRegex, (match) => {
        return match
            .replace(/&(?!(lt|gt|amp);)/g, "&amp;")
            .replace(/</g, "<")
            .replace(/>/g, ">")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    });
};
exports.encodeSpecialCharsInNodes = encodeSpecialCharsInNodes;
//# sourceMappingURL=diagramUtils.js.map