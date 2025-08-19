import { generateUmlFromPrompt, UMLDiagrams } from './umlGenerator';
import { generateEnhancedClassDiagram, convertClassDiagramToMethodSignatures, generateFileStructureFromClassDiagram } from './enhancedClassDiagramGenerator';
import { planMethodSignatures } from './methodSignaturePlanner';

export interface SimpleCodePlan {
  // Frontend diagrams
  frontendComponentDiagram: string;
  frontendClassDiagram: string;
  frontendSequenceDiagram: string;
  
  // Backend diagrams
  backendComponentDiagram: string;
  backendClassDiagram: string;
  backendSequenceDiagram: string;
  
  // Architecture diagram
  architectureDiagram: string;
  
  // Enhanced class structure
  enhancedClasses: any[];
  methodSignatures: any;
  fileStructure: any;
  
  // Metadata
  userPrompt: string;
  description: string;
}

/**
 * Generate a simple but complete code plan from user prompt
 */
export async function generateSimpleCodePlan(userPrompt: string): Promise<SimpleCodePlan> {
  console.log('[SimpleCodePlanGenerator] Generating simple code plan...');
  
  // Step 1: Generate basic UML diagrams (minimal and focused)
  console.log('[SimpleCodePlanGenerator] Step 1: Generating basic UML diagrams...');
  const umlDiagrams = await generateUmlFromPrompt(userPrompt);
  
  // Step 2: Generate enhanced class diagram with detailed structures
  console.log('[SimpleCodePlanGenerator] Step 2: Generating enhanced class diagram...');
  const enhancedClassDiagram = await generateEnhancedClassDiagram(userPrompt);
  
  // Step 3: Convert enhanced class diagram to method signatures
  console.log('[SimpleCodePlanGenerator] Step 3: Converting to method signatures...');
  const methodSignatures = convertClassDiagramToMethodSignatures(enhancedClassDiagram);
  
  // Step 4: Generate file structure from enhanced class diagram
  console.log('[SimpleCodePlanGenerator] Step 4: Generating file structure...');
  const fileStructure = generateFileStructureFromClassDiagram(enhancedClassDiagram);
  
  // Step 5: Create simple description
  const description = `Simple application based on: ${userPrompt}`;
  
  const codePlan: SimpleCodePlan = {
    // Frontend diagrams
    frontendComponentDiagram: umlDiagrams.frontendComponent || '',
    frontendClassDiagram: umlDiagrams.frontendClass || '',
    frontendSequenceDiagram: umlDiagrams.frontendSequence || '',
    
    // Backend diagrams
    backendComponentDiagram: umlDiagrams.backendComponent || '',
    backendClassDiagram: umlDiagrams.backendClass || '',
    backendSequenceDiagram: umlDiagrams.backendSequence || '',
    
    // Architecture diagram
    architectureDiagram: umlDiagrams.architecture || '',
    
    // Enhanced class structure
    enhancedClasses: enhancedClassDiagram.classes,
    methodSignatures,
    fileStructure,
    userPrompt,
    description
  };
  
  console.log(`[SimpleCodePlanGenerator] Generated code plan with ${enhancedClassDiagram.classes.length} classes`);
  return codePlan;
}

/**
 * Generate a minimal code plan for simple apps
 */
export async function generateMinimalCodePlan(userPrompt: string): Promise<SimpleCodePlan> {
  console.log('[SimpleCodePlanGenerator] Generating minimal code plan...');
  
  // For very simple apps, use a more direct approach
  const methodSignatures = await planMethodSignatures(userPrompt);
  
  // Create minimal file structure
  const fileStructure = {
    backend: methodSignatures.classes.map((cls: any) => ({
      path: `src/services/${cls.name}.ts`,
      content: '',
      dependencies: [],
      description: cls.description,
      type: 'service'
    }))
  };
  
  // Create minimal diagrams
  const frontendComponentDiagram = generateMinimalFrontendComponentDiagram(methodSignatures);
  const backendComponentDiagram = generateMinimalBackendComponentDiagram(methodSignatures);
  const frontendClassDiagram = generateMinimalFrontendClassDiagram(methodSignatures);
  const backendClassDiagram = generateMinimalBackendClassDiagram(methodSignatures);
  const frontendSequenceDiagram = generateMinimalFrontendSequenceDiagram(methodSignatures);
  const backendSequenceDiagram = generateMinimalBackendSequenceDiagram(methodSignatures);
  const architectureDiagram = generateMinimalArchitectureDiagram();
  
  const codePlan: SimpleCodePlan = {
    // Frontend diagrams
    frontendComponentDiagram,
    frontendClassDiagram,
    frontendSequenceDiagram,
    
    // Backend diagrams
    backendComponentDiagram,
    backendClassDiagram,
    backendSequenceDiagram,
    
    // Architecture diagram
    architectureDiagram,
    
    // Enhanced class structure
    enhancedClasses: methodSignatures.classes,
    methodSignatures,
    fileStructure,
    userPrompt,
    description: `Minimal application: ${userPrompt}`
  };
  
  console.log(`[SimpleCodePlanGenerator] Generated minimal code plan with ${methodSignatures.classes.length} classes`);
  return codePlan;
}

/**
 * Generate minimal frontend component diagram from method signatures
 */
function generateMinimalFrontendComponentDiagram(methodSignatures: any): string {
  const classes = methodSignatures.classes;
  
  let diagram = 'flowchart TB\n';
  diagram += '%% MINIMAL FRONTEND COMPONENT DIAGRAM\n';
  
  // Group by type
  const frontendClasses = classes.filter((cls: any) => 
    cls.name.includes('Component') || cls.name.includes('Page') || cls.name.includes('Form') ||
    cls.name.includes('List') || cls.name.includes('App')
  );
  
  if (frontendClasses.length > 0) {
    diagram += 'subgraph Frontend\n';
    frontendClasses.forEach((cls: any) => {
      diagram += `    ${cls.name}[${cls.name}]\n`;
    });
    diagram += 'end\n';
  } else {
    // Default frontend components
    diagram += 'subgraph Frontend\n';
    diagram += '    MainApp[MainApp]\n';
    diagram += '    FormComponent[FormComponent]\n';
    diagram += '    ListComponent[ListComponent]\n';
    diagram += 'end\n';
  }
  
  return diagram;
}

/**
 * Generate minimal backend component diagram from method signatures
 */
function generateMinimalBackendComponentDiagram(methodSignatures: any): string {
  const classes = methodSignatures.classes;
  
  let diagram = 'flowchart TB\n';
  diagram += '%% MINIMAL BACKEND COMPONENT DIAGRAM\n';
  
  // Group by type
  const backendClasses = classes.filter((cls: any) => 
    cls.name.includes('Service') || cls.name.includes('API') || cls.name.includes('Controller') ||
    cls.name.includes('Repository') || cls.name.includes('Model')
  );
  
  if (backendClasses.length > 0) {
    diagram += 'subgraph Backend\n';
    backendClasses.forEach((cls: any) => {
      diagram += `    ${cls.name}[${cls.name}]\n`;
    });
    diagram += 'end\n';
  } else {
    // Default backend components
    diagram += 'subgraph Backend\n';
    diagram += '    ApiController[ApiController]\n';
    diagram += '    DataService[DataService]\n';
    diagram += '    Database[Database]\n';
    diagram += 'end\n';
  }
  
  return diagram;
}

/**
 * Generate minimal frontend class diagram from method signatures
 */
function generateMinimalFrontendClassDiagram(methodSignatures: any): string {
  const classes = methodSignatures.classes;
  
  let diagram = 'classDiagram\n';
  diagram += '%% MINIMAL FRONTEND CLASS DIAGRAM\n';
  
  const frontendClasses = classes.filter((cls: any) => 
    cls.name.includes('Component') || cls.name.includes('Page') || cls.name.includes('Form') ||
    cls.name.includes('List') || cls.name.includes('App')
  );
  
  if (frontendClasses.length > 0) {
    frontendClasses.forEach((cls: any) => {
      diagram += `class ${cls.name} {\n`;
      
      // Add methods
      cls.methods.forEach((method: any) => {
        const params = method.parameters.map((p: any) => `${p.name}: ${p.type}`).join(', ');
        const returnType = method.isAsync ? `Promise<${method.returnType}>` : method.returnType;
        diagram += `    +${method.name}(${params}): ${returnType}\n`;
      });
      
      diagram += '}\n';
    });
  } else {
    // Default frontend classes
    diagram += `class MainApp {
    +data: any[]
    +handleSubmit()
    +handleChange()
}
class FormComponent {
    +title: string
    +handleSubmit()
}
class ListComponent {
    +items: any[]
    +onDelete(id: string)
}`;
  }
  
  return diagram;
}

/**
 * Generate minimal backend class diagram from method signatures
 */
function generateMinimalBackendClassDiagram(methodSignatures: any): string {
  const classes = methodSignatures.classes;
  
  let diagram = 'classDiagram\n';
  diagram += '%% MINIMAL BACKEND CLASS DIAGRAM\n';
  
  const backendClasses = classes.filter((cls: any) => 
    cls.name.includes('Service') || cls.name.includes('API') || cls.name.includes('Controller') ||
    cls.name.includes('Repository') || cls.name.includes('Model')
  );
  
  if (backendClasses.length > 0) {
    backendClasses.forEach((cls: any) => {
      diagram += `class ${cls.name} {\n`;
      
      // Add methods
      cls.methods.forEach((method: any) => {
        const params = method.parameters.map((p: any) => `${p.name}: ${p.type}`).join(', ');
        const returnType = method.isAsync ? `Promise<${method.returnType}>` : method.returnType;
        diagram += `    +${method.name}(${params}): ${returnType}\n`;
      });
      
      diagram += '}\n';
    });
  } else {
    // Default backend classes
    diagram += `class ApiController {
    +getData()
    +createItem(data: any)
    +deleteItem(id: string)
}
class DataService {
    +getAll()
    +create(data: any)
    +delete(id: string)
}
class Database {
    +query(sql: string)
    +save(data: any)
}`;
  }
  
  return diagram;
}

/**
 * Generate minimal frontend sequence diagram from method signatures
 */
function generateMinimalFrontendSequenceDiagram(methodSignatures: any): string {
  const classes = methodSignatures.classes;
  
  let diagram = 'sequenceDiagram\n';
  diagram += '%% MINIMAL FRONTEND SEQUENCE DIAGRAM\n';
  
  const frontendClasses = classes.filter((cls: any) => 
    cls.name.includes('Component') || cls.name.includes('Page') || cls.name.includes('Form') ||
    cls.name.includes('List') || cls.name.includes('App')
  );
  
  if (frontendClasses.length >= 2) {
    diagram += `participant U as User\n`;
    diagram += `participant ${frontendClasses[0].name}\n`;
    diagram += `participant ${frontendClasses[1].name}\n`;
    diagram += '\n';
    diagram += `U->>${frontendClasses[0].name}: User action\n`;
    diagram += `${frontendClasses[0].name}->>${frontendClasses[1].name}: Process request\n`;
    diagram += `${frontendClasses[1].name}-->>${frontendClasses[0].name}: Response\n`;
    diagram += `${frontendClasses[0].name}-->>U: Result\n`;
  } else {
    diagram += `participant U as User
participant MainApp
participant FormComponent

U->>FormComponent: Enter data
FormComponent->>MainApp: Submit form
MainApp-->>FormComponent: Success
FormComponent-->>U: Updated UI`;
  }
  
  return diagram;
}

/**
 * Generate minimal backend sequence diagram from method signatures
 */
function generateMinimalBackendSequenceDiagram(methodSignatures: any): string {
  const classes = methodSignatures.classes;
  
  let diagram = 'sequenceDiagram\n';
  diagram += '%% MINIMAL BACKEND SEQUENCE DIAGRAM\n';
  
  const backendClasses = classes.filter((cls: any) => 
    cls.name.includes('Service') || cls.name.includes('API') || cls.name.includes('Controller') ||
    cls.name.includes('Repository') || cls.name.includes('Model')
  );
  
  if (backendClasses.length >= 2) {
    diagram += `participant C as Client\n`;
    diagram += `participant ${backendClasses[0].name}\n`;
    diagram += `participant ${backendClasses[1].name}\n`;
    diagram += '\n';
    diagram += `C->>${backendClasses[0].name}: API request\n`;
    diagram += `${backendClasses[0].name}->>${backendClasses[1].name}: Process request\n`;
    diagram += `${backendClasses[1].name}-->>${backendClasses[0].name}: Response\n`;
    diagram += `${backendClasses[0].name}-->>C: API response\n`;
  } else {
    diagram += `participant C as Client
participant ApiController
participant DataService

C->>ApiController: POST /data
ApiController->>DataService: Create request
DataService-->>ApiController: Success
ApiController-->>C: 201 Created`;
  }
  
  return diagram;
}

/**
 * Generate minimal AWS architecture diagram
 */
function generateMinimalArchitectureDiagram(): string {
  return `flowchart TB
%% MINIMAL AWS ARCHITECTURE
subgraph Frontend
    S3[S3 Bucket]
end

subgraph Backend
    API[API Gateway]
    LAMBDA[Lambda Functions]
end

subgraph Database
    DB[DynamoDB]
end

S3 --> API
API --> LAMBDA
LAMBDA --> DB`;
}

/**
 * Validate code plan completeness
 */
export function validateCodePlan(codePlan: SimpleCodePlan): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!codePlan.frontendComponentDiagram) {
    errors.push('Missing frontend component diagram');
  }
  
  if (!codePlan.backendComponentDiagram) {
    errors.push('Missing backend component diagram');
  }
  
  if (!codePlan.frontendClassDiagram) {
    errors.push('Missing frontend class diagram');
  }
  
  if (!codePlan.backendClassDiagram) {
    errors.push('Missing backend class diagram');
  }
  
  if (!codePlan.enhancedClasses || codePlan.enhancedClasses.length === 0) {
    errors.push('No classes defined');
  }
  
  if (!codePlan.methodSignatures || !codePlan.methodSignatures.classes) {
    errors.push('No method signatures defined');
  }
  
  if (!codePlan.fileStructure || !codePlan.fileStructure.backend) {
    errors.push('No file structure defined');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate summary of code plan
 */
export function generateCodePlanSummary(codePlan: SimpleCodePlan): string {
  let summary = `# Code Plan Summary\n\n`;
  summary += `**User Request:** ${codePlan.userPrompt}\n\n`;
  summary += `**Description:** ${codePlan.description}\n\n`;
  
  summary += `## Components\n`;
  summary += `- **Classes:** ${codePlan.enhancedClasses?.length || 0}\n`;
  summary += `- **Files:** ${codePlan.fileStructure?.backend?.length || 0}\n`;
  
  // Calculate total methods safely
  const totalMethods = codePlan.enhancedClasses?.reduce((total, cls) => {
    return total + (cls.methods?.length || 0);
  }, 0) || 0;
  summary += `- **Methods:** ${totalMethods}\n\n`;
  
  summary += `## Diagrams Generated\n`;
  summary += `- **Frontend Component:** ${codePlan.frontendComponentDiagram ? '✅' : '❌'}\n`;
  summary += `- **Frontend Class:** ${codePlan.frontendClassDiagram ? '✅' : '❌'}\n`;
  summary += `- **Frontend Sequence:** ${codePlan.frontendSequenceDiagram ? '✅' : '❌'}\n`;
  summary += `- **Backend Component:** ${codePlan.backendComponentDiagram ? '✅' : '❌'}\n`;
  summary += `- **Backend Class:** ${codePlan.backendClassDiagram ? '✅' : '❌'}\n`;
  summary += `- **Backend Sequence:** ${codePlan.backendSequenceDiagram ? '✅' : '❌'}\n`;
  summary += `- **Architecture:** ${codePlan.architectureDiagram ? '✅' : '❌'}\n\n`;
  
  summary += `## Class Overview\n`;
  if (codePlan.enhancedClasses && codePlan.enhancedClasses.length > 0) {
    codePlan.enhancedClasses.forEach(cls => {
      summary += `- **${cls.name}:** ${cls.description || 'No description'}\n`;
      summary += `  - Methods: ${cls.methods?.length || 0}\n`;
      summary += `  - Properties: ${cls.members?.length || 0}\n`;
    });
  } else {
    summary += `- No classes defined\n`;
  }
  
  summary += `\n## Architecture\n`;
  summary += `- Frontend: S3 + React\n`;
  summary += `- Backend: Lambda + API Gateway\n`;
  summary += `- Database: DynamoDB\n`;
  
  return summary;
} 