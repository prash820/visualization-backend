import { encodeSpecialCharsInNodes } from "./diagramUtils";

export const sanitizeAndValidateMermaidCode = (rawCode: string, diagramType: string): string => {
    const validDiagramTypes = [
      "graph",
      "flowchart",
      "sequenceDiagram",
      "classDiagram",
      "stateDiagram",
      "gantt",
      "erDiagram",
      "journey",
      "pie",
      "requirementDiagram",
    ];
  
    const validStart = new RegExp(`^(${validDiagramTypes.join("|")})\\s*(TD|LR|BT|RL)?\\s*`, "i");
    const sanitizedCode = encodeSpecialCharsInNodes(rawCode.trim().replace(/^```mermaid|```$/g, ""));  

    if (!validStart.test(sanitizedCode)) {
      throw new Error(
        `Mermaid syntax error: Diagram must start with a valid type. Supported types are: ${validDiagramTypes.join(", ")}.`
      );
    }
  
    return sanitizedCode;
  };
  
  export const extractVisualizationCode = (responseText: string, framework: string): string | null => {
    const regexMap: { [key: string]: RegExp } = {
      Mermaid: /```mermaid\s([\s\S]*?)```/,
      Graphviz: /```graphviz\s([\s\S]*?)```/,
    };
  
    const fallbackRegexMap : { [key: string]: RegExp } = {
      Mermaid: /^\s*(sequenceDiagram|graph|flowchart|classDiagram|stateDiagram|gantt|erDiagram|journey|pie|requirementDiagram)[\s\S]*/m,
      Graphviz: /^\s*(digraph|graph|subgraph)\s+\w+\s*\{[\s\S]*\}/m,
    };
  
    const codeBlockMatch = responseText.match(regexMap[framework]);
    if (codeBlockMatch) return codeBlockMatch[1].trim();
  
    const fallbackMatch = responseText.match(fallbackRegexMap[framework]);
    if (fallbackMatch) return fallbackMatch[0].trim();
  
    return null;
  };
  