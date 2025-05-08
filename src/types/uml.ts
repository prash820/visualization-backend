export interface UmlDiagramResponse {
  diagrams: {
    sequence: string;
    entity: string;
    component: string;
  };
  metadata: {
    generatedAt: string;
    prompt: string;
  };
} 