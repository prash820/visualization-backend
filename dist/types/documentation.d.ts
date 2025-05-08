export interface DocumentationSection {
    title: string;
    content: string;
    diagrams?: string[];
}
export interface DocumentationMetadata {
    generatedAt: string;
    prompt: string;
}
export interface DocumentationResponse {
    highLevel: DocumentationSection[];
    lowLevel: DocumentationSection[];
    metadata: DocumentationMetadata;
}
