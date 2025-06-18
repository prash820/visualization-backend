"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractVisualizationCode = exports.sanitizeAndValidateMermaidCode = void 0;
const diagramUtils_1 = require("./diagramUtils");
const sanitizeAndValidateMermaidCode = (rawCode, diagramType) => {
    const validDiagramTypes = [
        "graph",
        "flowchart",
        "sequenceDiagram",
        "classDiagram",
        "stateDiagram",
        "gantt",
        "journey",
        "pie",
        "requirementDiagram",
    ];
    const validStart = new RegExp(`^(${validDiagramTypes.join("|")})\\s*(TD|LR|BT|RL)?\\s*`, "i");
    const sanitizedCode = (0, diagramUtils_1.encodeSpecialCharsInNodes)(rawCode.trim().replace(/^```mermaid|```$/g, ""));
    if (!validStart.test(sanitizedCode)) {
        throw new Error(`Mermaid syntax error: Diagram must start with a valid type. Supported types are: ${validDiagramTypes.join(", ")}.`);
    }
    return sanitizedCode;
};
exports.sanitizeAndValidateMermaidCode = sanitizeAndValidateMermaidCode;
const extractVisualizationCode = (responseText, framework) => {
    const regexMap = {
        Mermaid: /```mermaid\s([\s\S]*?)```/,
        Graphviz: /```graphviz\s([\s\S]*?)```/,
    };
    const fallbackRegexMap = {
        Mermaid: /^\s*(sequenceDiagram|graph|flowchart|classDiagram|stateDiagram|gantt|erDiagram|journey|pie|requirementDiagram)[\s\S]*/m,
        Graphviz: /^\s*(digraph|graph|subgraph)\s+\w+\s*\{[\s\S]*\}/m,
    };
    const codeBlockMatch = responseText.match(regexMap[framework]);
    if (codeBlockMatch)
        return codeBlockMatch[1].trim();
    const fallbackMatch = responseText.match(fallbackRegexMap[framework]);
    if (fallbackMatch)
        return fallbackMatch[0].trim();
    return null;
};
exports.extractVisualizationCode = extractVisualizationCode;
