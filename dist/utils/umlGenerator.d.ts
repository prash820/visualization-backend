interface UMLDiagrams {
    sequence: string;
    entity: string;
    component: string;
}
export declare const generateUmlFromPrompt: (prompt: string) => Promise<{
    [key: string]: string;
}>;
export declare function parseUMLResponse(response: string): UMLDiagrams;
export {};
