import { openai, OPENAI_MODEL } from '../config/aiProvider';
import fs from 'fs';
import path from 'path';

export interface UMLDiagrams {
  // Frontend diagrams
  frontendComponent?: string;    // Frontend component diagram
  frontendClass?: string;        // Frontend class diagram
  frontendSequence?: string;     // Frontend sequence diagram
  
  // Backend diagrams
  backendComponent?: string;     // Backend component diagram
  backendClass?: string;         // Backend class diagram
  backendSequence?: string;      // Backend sequence diagram
  
  // Architecture diagram
  architecture?: string;         // Simple AWS architecture
}

const getMermaidDocs = (): string => {
  try {
    const docsPath = path.join(__dirname, '../../mermaid-docs/docs/syntax');
    
    // Read only essential documentation
    const flowchartDoc = fs.readFileSync(path.join(docsPath, 'flowchart.md'), 'utf-8');
    const classDoc = fs.readFileSync(path.join(docsPath, 'classDiagram.md'), 'utf-8');
    const sequenceDoc = fs.readFileSync(path.join(docsPath, 'sequenceDiagram.md'), 'utf-8');
    
    return `
MERMAID SYNTAX REFERENCE:

FLOWCHART (for component diagrams):
${flowchartDoc.substring(0, 2000)}

CLASS DIAGRAM (for class structure):
${classDoc.substring(0, 2000)}

SEQUENCE DIAGRAM (for interactions):
${sequenceDoc.substring(0, 2000)}

CRITICAL RULES:
- Keep diagrams SIMPLE and MINIMAL
- Use only essential components/classes
- Focus on core functionality only
- Avoid over-engineering
- Use consistent naming
    `;
  } catch (error) {
    console.error('[UML Generator] Error reading Mermaid docs:', error);
    return '';
  }
};

export const generateUmlFromPrompt = async (prompt: string): Promise<UMLDiagrams> => {
  try {
    const mermaidDocs = getMermaidDocs();
    
    // COMMENTED OUT: Frontend component diagram - not needed for infrastructure focus
    /*
    // Step 1: Generate MINIMAL frontend component diagram
    console.log("[UML Generator] Step 1: Generating minimal frontend component diagram...");
    const frontendComponentCompletion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a minimalist frontend architect. Create a MINIMAL frontend component diagram with ONLY the essential components needed for the core user flow.

${mermaidDocs}

CRITICAL REQUIREMENTS:
- MINIMAL: Only 3-5 essential frontend components maximum
- FOCUSED: Only core user flow components, no extra features
- SIMPLE: Each component has a single, clear responsibility
- IMPLEMENTABLE: React components that can be easily built
- USER-FLOW: Focus on the main user journey only

MINIMAL FRONTEND COMPONENT PATTERNS:
- Main App component (container)
- Core feature component (based on user request)
- Form component (if needed for user input)
- List/Display component (if needed for data display)
- Auth component (if authentication is essential)

Return ONLY this format:

\`\`\`mermaid
flowchart TB
%% MINIMAL FRONTEND COMPONENT DIAGRAM - Only essential components for core user flow
[Your minimal frontend component diagram with 3-5 essential components only]
\`\`\`

EXAMPLE FOR A NOTES APP:
\`\`\`mermaid
flowchart TB
    subgraph Frontend
        A[NotesApp] --> B[NotesList]
        A --> C[NoteForm]
        B --> D[NoteItem]
    end
\`\`\`

Create a MINIMAL diagram with only the essential components for the core user flow.`
        },
        {
          role: "user",
          content: `Create a minimal frontend component diagram for this application: ${prompt}`
        }
      ],
      temperature: 0.2,
      max_tokens: 1500
    });
    */

    // COMMENTED OUT: Backend component diagram - not needed for infrastructure focus
    /*
    // Step 2: Generate MINIMAL backend component diagram
    console.log("[UML Generator] Step 2: Generating minimal backend component diagram...");
    const backendComponentCompletion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a minimalist backend architect. Create a MINIMAL backend component diagram with ONLY the essential services needed for the core functionality.

${mermaidDocs}

CRITICAL REQUIREMENTS:
- MINIMAL: Only 3-5 essential backend components maximum
- FOCUSED: Only core functionality services, no extra features
- SIMPLE: Each component has a single, clear responsibility
- IMPLEMENTABLE: Backend services that can be easily built
- CORE-FUNCTIONALITY: Focus on the main app functionality only

MINIMAL BACKEND COMPONENT PATTERNS:
- Main Controller (API endpoints)
- Core Service (business logic)
- Repository/Data access (if needed)
- Database (if needed)
- Auth Service (only if authentication is essential)

Return ONLY this format:

\`\`\`mermaid
flowchart TB
%% MINIMAL BACKEND COMPONENT DIAGRAM - Only essential services for core functionality
[Your minimal backend component diagram with 3-5 essential services only]
\`\`\`

EXAMPLE FOR A NOTES APP:
\`\`\`mermaid
flowchart TB
    subgraph Backend
        A[NotesController] --> B[NotesService]
        B --> C[NotesRepository]
        C --> D[Database]
    end
\`\`\`

Create a MINIMAL diagram with only the essential services for the core functionality.`
        },
        {
          role: "user",
          content: `Create a minimal backend component diagram for this application: ${prompt}`
        }
      ],
      temperature: 0.2,
      max_tokens: 1500
    });
    */

    // COMMENTED OUT: Parse component diagrams - not needed
    /*
    // Parse component diagrams
    const frontendComponentDiagram = parseUMLResponse(frontendComponentCompletion.choices[0].message.content || '');
    const backendComponentDiagram = parseUMLResponse(backendComponentCompletion.choices[0].message.content || '');
    
    const frontendComponents = frontendComponentDiagram.frontendComponent || '';
    const backendComponents = backendComponentDiagram.backendComponent || '';
    */

    // COMMENTED OUT: Frontend class diagram - not needed for infrastructure focus
    /*
    // Step 3: Generate MINIMAL frontend class diagram
    console.log("[UML Generator] Step 3: Generating minimal frontend class diagram...");
    const frontendClassCompletion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a minimalist frontend architect. Create a MINIMAL frontend class diagram based on the provided frontend component diagram. Include ONLY the essential classes.

${mermaidDocs}

FRONTEND COMPONENT DIAGRAM:
${frontendComponents}

CRITICAL REQUIREMENTS:
- MINIMAL: Include ONLY the essential classes from the frontend component diagram
- FOCUSED: Only core functionality methods and properties
- CONSISTENT: Use same component names from frontend component diagram
- IMPLEMENTABLE: React components that can be easily coded
- SIMPLE: Keep methods and properties minimal

MINIMAL FRONTEND CLASS PATTERNS:
- Main App class with core state and methods
- Core feature class with essential functionality
- Form class with basic input handling (if needed)
- List class with basic display methods (if needed)
- Keep methods simple: handleSubmit, handleChange, etc.

Return ONLY this format:

\`\`\`mermaid
classDiagram
%% MINIMAL FRONTEND CLASS DIAGRAM - Only essential classes with core functionality
[Your minimal frontend class diagram using only essential components from above]
\`\`\`

EXAMPLE FOR A NOTES APP:
\`\`\`mermaid
classDiagram
    class NotesApp {
        +notes: Note[]
        +addNote(note: Note)
        +deleteNote(id: string)
    }
    
    class NotesList {
        +notes: Note[]
        +onDelete(id: string)
    }
    
    class NoteForm {
        +title: string
        +handleSubmit()
    }
    
    NotesApp --> NotesList
    NotesApp --> NoteForm
\`\`\`

Create a MINIMAL class diagram with only the essential classes and methods.`
        },
        {
          role: "user",
          content: `Create a minimal frontend class diagram based on the frontend component diagram for this application: ${prompt}`
        }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });
    */

    // COMMENTED OUT: Backend class diagram - not needed for infrastructure focus
    /*
    // Step 4: Generate MINIMAL backend class diagram
    console.log("[UML Generator] Step 4: Generating minimal backend class diagram...");
    const backendClassCompletion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a minimalist backend architect. Create a MINIMAL backend class diagram based on the provided backend component diagram. Include ONLY the essential classes.

${mermaidDocs}

BACKEND COMPONENT DIAGRAM:
${backendComponents}

CRITICAL REQUIREMENTS:
- MINIMAL: Include ONLY the essential classes from the backend component diagram
- FOCUSED: Only core functionality methods and properties
- CONSISTENT: Use same service names from backend component diagram
- IMPLEMENTABLE: Backend services that can be easily coded
- SIMPLE: Keep methods and properties minimal

MINIMAL BACKEND CLASS PATTERNS:
- Main Controller class with essential API methods
- Core Service class with essential business logic
- Repository class with basic data access (if needed)
- Keep methods simple: create, read, update, delete

Return ONLY this format:

\`\`\`mermaid
classDiagram
%% MINIMAL BACKEND CLASS DIAGRAM - Only essential classes with core functionality
[Your minimal backend class diagram using only essential services from above]
\`\`\`

EXAMPLE FOR A NOTES APP:
\`\`\`mermaid
classDiagram
    class NotesController {
        +getNotes()
        +createNote(note: Note)
        +deleteNote(id: string)
    }
    
    class NotesService {
        +getAllNotes()
        +createNote(note: Note)
        +deleteNote(id: string)
    }
    
    class NotesRepository {
        +findAll()
        +save(note: Note)
        +deleteById(id: string)
    }
    
    NotesController --> NotesService
    NotesService --> NotesRepository
\`\`\`

Create a MINIMAL class diagram with only the essential classes and methods.`
        },
        {
          role: "user",
          content: `Create a minimal backend class diagram based on the backend component diagram for this application: ${prompt}`
        }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });
    */

    // COMMENTED OUT: Frontend sequence diagram - not needed for infrastructure focus
    /*
    // Step 5: Generate MINIMAL frontend sequence diagram
    console.log("[UML Generator] Step 5: Generating minimal frontend sequence diagram...");
    const frontendSequenceCompletion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a minimalist frontend architect. Create a MINIMAL frontend sequence diagram showing the core user interaction flow.

${mermaidDocs}

FRONTEND COMPONENT DIAGRAM:
${frontendComponents}

CRITICAL REQUIREMENTS:
- MINIMAL: Show only the main user interaction flow (2-3 steps)
- FOCUSED: Only core functionality interactions
- CONSISTENT: Use same component names from frontend component diagram
- SIMPLE: Basic frontend component interactions only
- USER-FLOW: Focus on the main user action and response

MINIMAL FRONTEND SEQUENCE PATTERNS:
- User action with main component
- Component interaction with form/list (if needed)
- Response back to user
- Keep it simple: 2-3 interactions maximum

Return ONLY this format:

\`\`\`mermaid
sequenceDiagram
%% MINIMAL FRONTEND SEQUENCE DIAGRAM - Core user interaction flow
[Your minimal frontend sequence diagram showing main user flow]
\`\`\`

EXAMPLE FOR A NOTES APP:
\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant A as NotesApp
    participant F as NoteForm
    participant L as NotesList
    
    U->>F: Enter note details
    F->>A: Submit note
    A->>L: Add note to list
    L-->>U: Show updated list
\`\`\`

Create a MINIMAL sequence diagram showing only the core user interaction flow.`
        },
        {
          role: "user",
          content: `Create a minimal frontend sequence diagram for the core user interaction flow: ${prompt}`
        }
      ],
      temperature: 0.2,
      max_tokens: 1500
    });
    */

    // COMMENTED OUT: Backend sequence diagram - not needed for infrastructure focus
    /*
    // Step 6: Generate MINIMAL backend sequence diagram
    console.log("[UML Generator] Step 6: Generating minimal backend sequence diagram...");
    const backendSequenceCompletion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a minimalist backend architect. Create a MINIMAL backend sequence diagram showing the core API request flow.

${mermaidDocs}

BACKEND COMPONENT DIAGRAM:
${backendComponents}

CRITICAL REQUIREMENTS:
- MINIMAL: Show only the main API request flow (2-3 steps)
- FOCUSED: Only core functionality API interactions
- CONSISTENT: Use same service names from backend component diagram
- SIMPLE: Basic backend service interactions only
- API-FLOW: Focus on the main API request and response

MINIMAL BACKEND SEQUENCE PATTERNS:
- Client request to main controller
- Controller interaction with service (if needed)
- Service interaction with repository/database (if needed)
- Response back to client
- Keep it simple: 2-3 interactions maximum

Return ONLY this format:

\`\`\`mermaid
sequenceDiagram
%% MINIMAL BACKEND SEQUENCE DIAGRAM - Core API request flow
[Your minimal backend sequence diagram showing main API flow]
\`\`\`

EXAMPLE FOR A NOTES APP:
\`\`\`mermaid
sequenceDiagram
    participant C as Client
    participant A as NotesController
    participant S as NotesService
    participant S as NotesService
    participant D as Database
    
    C->>A: POST /notes
    A->>S: Create note request
    S->>D: Save note
    D-->>S: Success
    S-->>A: Note created
    A-->>C: Success response
\`\`\`

Create a MINIMAL sequence diagram showing only the core API request flow.`
        },
        {
          role: "user",
          content: `Create a minimal backend sequence diagram for the core API request flow: ${prompt}`
        }
      ],
      temperature: 0.2,
      max_tokens: 1500
    });
    */

    // Step 1: Generate MINIMAL AWS architecture diagram (ONLY DIAGRAM WE NEED)
    console.log("[UML Generator] Step 1: Generating minimal AWS architecture diagram...");
    const architectureCompletion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a minimalist cloud architect. Create a MINIMAL AWS architecture diagram using only essential services.

${mermaidDocs}

CRITICAL REQUIREMENTS:
- MINIMAL: Only 3-4 essential AWS services maximum
- FOCUSED: Only core functionality infrastructure
- SIMPLE: Basic serverless architecture
- STANDARD: S3, Lambda, API Gateway, DynamoDB
- CORE-FUNCTIONALITY: Focus on the main app functionality only

MINIMAL AWS ARCHITECTURE PATTERNS:
- Frontend: S3 for static hosting
- Backend: API Gateway + Lambda for serverless functions
- Database: DynamoDB for data storage
- Keep it simple: 3-4 services maximum

Return ONLY this format:

\`\`\`mermaid
flowchart TB
%% MINIMAL AWS ARCHITECTURE - Only essential services for core functionality
[Your minimal AWS architecture with 3-4 essential services only]
\`\`\`

EXAMPLE MINIMAL ARCHITECTURE:
\`\`\`mermaid
flowchart TB
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
    LAMBDA --> DB
\`\`\`

Create a MINIMAL architecture diagram with only the essential services for core functionality.`
        },
        {
          role: "user",
          content: `Create a minimal AWS architecture for this application: ${prompt}`
        }
      ],
      temperature: 0.2,
      max_tokens: 1500
    });

    // COMMENTED OUT: Parse all responses except architecture - not needed
    /*
    // Parse all responses
    const frontendClassDiagrams = parseUMLResponse(frontendClassCompletion.choices[0].message.content || '');
    const backendClassDiagrams = parseUMLResponse(backendClassCompletion.choices[0].message.content || '');
    const frontendSequenceDiagrams = parseUMLResponse(frontendSequenceCompletion.choices[0].message.content || '');
    const backendSequenceDiagrams = parseUMLResponse(backendSequenceCompletion.choices[0].message.content || '');
    */
    
    // Parse only architecture diagram
    const architectureDiagrams = parseUMLResponse(architectureCompletion.choices[0].message.content || '');

    // Return only architecture diagram
    const allDiagrams: UMLDiagrams = {
      // COMMENTED OUT: All other diagrams - not needed for infrastructure focus
      // ...frontendComponentDiagram,
      // ...backendComponentDiagram,
      // ...frontendClassDiagrams,
      // ...backendClassDiagrams,
      // ...frontendSequenceDiagrams,
      // ...backendSequenceDiagrams,
      ...architectureDiagrams
    };

    console.log("[UML Generator] Generated diagram types:", Object.keys(allDiagrams));
    return allDiagrams;

  } catch (error) {
    console.error("[UML Generator] Error generating UML diagrams:", error);
    throw error;
  }
};

export function parseUMLResponse(response: string): UMLDiagrams {
  const diagrams: UMLDiagrams = {};
  const regex = /```mermaid\s*([\s\S]*?)```/g;
  let match;
  
  while ((match = regex.exec(response)) !== null) {
    const content = match[1].trim();
    
    if (content.startsWith("classDiagram")) {
      // Determine if this is frontend or backend based on content
      const isFrontend = content.includes('App') || content.includes('Component') || 
                        content.includes('Form') || content.includes('List') ||
                        content.includes('handleSubmit') || content.includes('handleChange');
      
      if (isFrontend) {
        diagrams.frontendClass = content;
      } else {
        diagrams.backendClass = content;
      }
    } else if (content.startsWith("sequenceDiagram")) {
      // Determine if this is frontend or backend based on content
      const isFrontend = content.includes('User') || content.includes('Form') || 
                        content.includes('App') || content.includes('List');
      
      if (isFrontend) {
        diagrams.frontendSequence = content;
      } else {
        diagrams.backendSequence = content;
      }
    } else if (content.startsWith("flowchart")) {
      // Determine if this is component, frontend component, backend component, or architecture
      const isArchitecture = content.includes('S3') || content.includes('Lambda') ||
                            content.includes('DynamoDB') || content.includes('API Gateway');
      
      const isFrontendComponent = content.includes('Frontend') || content.includes('App') ||
                                 content.includes('Form') || content.includes('List');
      
      const isBackendComponent = content.includes('Backend') || content.includes('Service') ||
                                content.includes('Controller') || content.includes('Repository');
      
      if (isArchitecture) {
        diagrams.architecture = content;
      } else if (isFrontendComponent) {
        diagrams.frontendComponent = content;
      } else if (isBackendComponent) {
        diagrams.backendComponent = content;
      } else {
        // Fallback: if it has both frontend and backend, it's a general component diagram
        if (content.includes('Frontend') && content.includes('Backend')) {
          // Split into separate diagrams or use as general component
          diagrams.frontendComponent = content;
          diagrams.backendComponent = content;
        } else {
          // Default to backend component if unclear
          diagrams.backendComponent = content;
        }
      }
    }
  }
  
  return diagrams;
}