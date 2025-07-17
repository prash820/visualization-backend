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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUmlFromPrompt = void 0;
exports.parseUMLResponse = parseUMLResponse;
const openai_1 = __importDefault(require("openai"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const getAwsLogoNames = () => {
    try {
        const logoPath = path_1.default.join(__dirname, 'aws-logo-names.txt');
        const logoContent = fs_1.default.readFileSync(logoPath, 'utf-8');
        return logoContent.split('\n')
            .filter(line => line.trim() && !line.startsWith('//'))
            .join('\n');
    }
    catch (error) {
        console.error('[UML Generator] Error reading AWS logo names:', error);
        return '';
    }
};
const getMermaidDocs = () => {
    try {
        const docsPath = path_1.default.join(__dirname, '../../mermaid-docs/docs/syntax');
        // Read the key documentation files with more comprehensive content
        const flowchartDoc = fs_1.default.readFileSync(path_1.default.join(docsPath, 'flowchart.md'), 'utf-8');
        const classDoc = fs_1.default.readFileSync(path_1.default.join(docsPath, 'classDiagram.md'), 'utf-8');
        const sequenceDoc = fs_1.default.readFileSync(path_1.default.join(docsPath, 'sequenceDiagram.md'), 'utf-8');
        const erDoc = fs_1.default.readFileSync(path_1.default.join(docsPath, 'entityRelationshipDiagram.md'), 'utf-8');
        const architectureDoc = fs_1.default.readFileSync(path_1.default.join(docsPath, 'architecture.md'), 'utf-8');
        const stateDoc = fs_1.default.readFileSync(path_1.default.join(docsPath, 'stateDiagram.md'), 'utf-8');
        const c4Doc = fs_1.default.readFileSync(path_1.default.join(docsPath, 'c4.md'), 'utf-8');
        return `
MERMAID OFFICIAL DOCUMENTATION - COMPREHENSIVE REFERENCE:

FLOWCHART DOCUMENTATION (for component diagrams):
${flowchartDoc.substring(0, 5000)}

CLASS DIAGRAM DOCUMENTATION (for detailed class modeling):
${classDoc.substring(0, 5000)}

SEQUENCE DIAGRAM DOCUMENTATION (for detailed interactions):
${sequenceDoc.substring(0, 5000)}

ENTITY RELATIONSHIP DOCUMENTATION (for database modeling):
${erDoc.substring(0, 5000)}

ARCHITECTURE DIAGRAM DOCUMENTATION (for system architecture):
${architectureDoc.substring(0, 5000)}

STATE DIAGRAM DOCUMENTATION (for system behavior modeling):
${stateDoc.substring(0, 5000)}

C4 DIAGRAM DOCUMENTATION (for context and container modeling):
${c4Doc.substring(0, 5000)}

CRITICAL SYNTAX RULES:
- Use proper indentation and line breaks
- Each element must be on its own line
- Use correct syntax for relationships and connections
- Follow the exact format shown in examples
- Use proper grouping and subgraph syntax
- Include all necessary attributes and methods
- Use proper UML notation and symbols
    `;
    }
    catch (error) {
        console.error('[UML Generator] Error reading Mermaid docs:', error);
        return '';
    }
};
const generateUmlFromPrompt = (prompt) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const mermaidDocs = getMermaidDocs();
        // First call: Generate detailed UML diagrams (class, sequence, entity)
        console.log("[UML Generator] Generating detailed UML diagrams...");
        const basicCompletion = yield openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an expert software architect and UML modeling specialist. Your task is to create comprehensive, detailed UML diagrams that provide deep architectural insights.

${mermaidDocs}

Generate ONLY these 3 diagram types with maximum detail:

1. CLASS DIAGRAM (classDiagram):
   - Include ALL classes with complete attributes (data types, visibility, default values)
   - Include ALL methods with parameters, return types, and visibility
   - Show ALL relationships: inheritance, composition, aggregation, associations, dependencies
   - Use proper UML notation: + (public), - (private), # (protected), ~ (package)
   - Include abstract classes, interfaces, and their implementations
   - Show multiplicity (1, *, 0..1, 1..*, etc.)
   - Include stereotypes where appropriate (<<Entity>>, <<Service>>, <<Controller>>, etc.)
   - Group related classes logically

2. SEQUENCE DIAGRAM (sequenceDiagram):
   - Show complete user interactions and system responses
   - Include ALL actors (User, Admin, External APIs, Database, etc.)
   - Show detailed message flows with parameters
   - Include return values and error handling
   - Show activation bars for method calls
   - Include conditional flows (alt, opt, loop)
   - Show database transactions and external API calls
   - Include timing considerations where relevant

3. ENTITY RELATIONSHIP DIAGRAM (erDiagram):
   - Include ALL entities with complete attributes
   - Show data types, constraints, and relationships
   - Include primary keys, foreign keys, and indexes
   - Show cardinality (1:1, 1:N, M:N)
   - Include junction tables for many-to-many relationships
   - Show inheritance and specialization
   - Include business rules and constraints
   - Show audit fields (created_at, updated_at, etc.)

Return in this exact format:

\`\`\`mermaid
classDiagram
[Your detailed class diagram here with complete attributes, methods, and relationships]
\`\`\`

\`\`\`mermaid
sequenceDiagram
[Your detailed sequence diagram here with complete interactions]
\`\`\`

\`\`\`mermaid
erDiagram
[Your detailed entity relationship diagram here with complete entities and relationships]
\`\`\`

CRITICAL REQUIREMENTS:
- Be extremely detailed and comprehensive
- Include ALL classes, methods, attributes, and relationships
- Use proper UML notation and syntax
- Make diagrams production-ready and architecturally sound
- Follow the exact syntax from the official Mermaid documentation
- Ensure diagrams are complex enough to be useful for real development`
                },
                {
                    role: "user",
                    content: `Generate comprehensive, detailed UML diagrams for this system. Make them production-ready with complete architectural details: ${prompt}`
                }
            ],
            temperature: 0.3,
            max_tokens: 4000
        });
        // Second call: Generate detailed component diagrams (frontend, backend, architecture)
        console.log("[UML Generator] Generating detailed component diagrams...");
        const componentCompletion = yield openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an expert software architect specializing in system architecture and component modeling. Create comprehensive, detailed component diagrams that provide deep architectural insights.

${mermaidDocs}

Generate ONLY these 3 diagram types with maximum detail:

1. FRONTEND COMPONENT DIAGRAM (flowchart TB):
   - Show ALL UI components, pages, and layouts
   - Include component hierarchy and nesting
   - Show state management (Redux, Context, etc.)
   - Include routing and navigation flows
   - Show data flow between components
   - Include external integrations (APIs, third-party services)
   - Show responsive design considerations
   - Include error boundaries and loading states
   - Use subgraphs to group related components
   - Show component props and event flows

2. BACKEND COMPONENT DIAGRAM (flowchart TB):
   - Show ALL services, controllers, and business logic
   - Include database layers and data access patterns
   - Show API endpoints and their relationships
   - Include authentication and authorization flows
   - Show caching strategies and external integrations
   - Include message queues and event systems
   - Show microservices or monolithic architecture
   - Include monitoring and logging components
   - Show deployment and infrastructure considerations
   - Use subgraphs to group related services

3. ARCHITECTURE DIAGRAM (flowchart TB):
   - Create a simple serverless architecture diagram
   - Use subgraph "Frontend" for static assets (S3, CloudFront)
   - Use subgraph "Backend" for serverless functions (Lambda, API Gateway)
   - Use subgraph "Database" for data storage (DynamoDB, RDS if needed)
   - Use subgraph "Security" for basic security (IAM, CloudWatch)
   - Show simple connections between services
   - Focus on serverless and managed services
   - Keep it simple: S3 + Lambda + API Gateway + DynamoDB
   - Avoid complex networking (VPC, subnets, etc.)
   - Show basic monitoring and logging

Return in this exact format:

\`\`\`mermaid
flowchart TB
[Your detailed frontend component diagram here]
\`\`\`

\`\`\`mermaid
flowchart TB
[Your detailed backend component diagram here]
\`\`\`

\`\`\`mermaid
flowchart TB
[Your detailed architecture diagram here with concrete infrastructure resources only]
\`\`\`

EXAMPLE ARCHITECTURE DIAGRAM STRUCTURE:
\`\`\`mermaid
flowchart TB
    subgraph "Frontend"
        direction TB
        S3[S3 Bucket - Static Assets]
        CloudFront[CloudFront CDN]
        Route53[Route 53 DNS]
    end
    
    subgraph "Backend"
        direction TB
        API_Gateway[API Gateway]
        Lambda[Lambda Functions]
    end
    
    subgraph "Database"
        direction TB
        DynamoDB[DynamoDB Table]
    end
    
    subgraph "Security & Monitoring"
        direction TB
        IAM[IAM Roles]
        CloudWatch[CloudWatch Logs]
    end

    %% Frontend connections
    S3 -->|static files| CloudFront
    CloudFront -->|serves| User[Users]
    Route53 -->|DNS| CloudFront
    
    %% Backend connections
    User -->|API calls| API_Gateway
    API_Gateway -->|triggers| Lambda
    Lambda -->|reads/writes| DynamoDB
    
    %% Security & Monitoring
    IAM -->|permissions| Lambda
    IAM -->|permissions| S3
    Lambda -->|logs| CloudWatch
    API_Gateway -->|logs| CloudWatch
\`\`\`

CRITICAL REQUIREMENTS:
- Be extremely detailed and comprehensive
- Include ALL components, services, and relationships
- Show complete system architecture and data flows
- Use proper Mermaid syntax and follow documentation exactly
- Make diagrams production-ready and architecturally sound
- Include security, scalability, and performance considerations`
                },
                {
                    role: "user",
                    content: `Generate comprehensive, detailed component diagrams for this system. Make them production-ready with complete architectural details: ${prompt}`
                }
            ],
            temperature: 0.3,
            max_tokens: 4000
        });
        // Third call: Generate separate frontend and backend diagram sets
        console.log("[UML Generator] Generating separate frontend and backend diagram sets...");
        const separateDiagramsCompletion = yield openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an expert software architect specializing in frontend and backend separation. Create detailed, separate diagram sets for frontend and backend to enable better code generation.

${mermaidDocs}

Generate ONLY these 4 diagram types with maximum detail and CLEAR SEPARATION:

**FRONTEND DIAGRAMS (React/TypeScript Frontend Only):**

1. FRONTEND CLASS DIAGRAM (classDiagram):
   - ONLY React components, hooks, and frontend utilities
   - React component classes with props and state
   - Custom hooks (useAuth, useApi, etc.)
   - Context providers and consumers
   - Frontend service classes (API clients)
   - TypeScript interfaces for frontend data
   - NO backend controllers, services, or database classes
   - Examples: LoginComponent, DashboardComponent, useAuth, AuthContext

2. FRONTEND SEQUENCE DIAGRAM (sequenceDiagram):
   - ONLY frontend component interactions
   - User interactions with React components
   - Component-to-component communication
   - API calls from frontend to backend (but don't show backend internals)
   - State management flows (Redux, Context)
   - Navigation and routing flows
   - NO backend service-to-service communication
   - Examples: User clicks button → Component updates → API call

**BACKEND DIAGRAMS (Node.js/Express Backend Only):**

3. BACKEND CLASS DIAGRAM (classDiagram):
   - ONLY backend models, services, and controllers
   - Express controllers and middleware
   - Business logic services
   - Database models and repositories
   - Authentication and authorization classes
   - API service classes
   - NO React components or frontend classes
   - Examples: UserController, AuthService, UserModel, Database

4. BACKEND SEQUENCE DIAGRAM (sequenceDiagram):
   - ONLY backend service interactions
   - API endpoint request/response flows
   - Service-to-service communication
   - Database operations and transactions
   - Authentication and validation flows
   - NO frontend component interactions
   - Examples: Controller → Service → Database → Response

Return in this exact format with CLEAR LABELS:

\`\`\`mermaid
classDiagram
%% FRONTEND CLASS DIAGRAM - React Components Only
[Your detailed frontend class diagram here with ONLY React components, hooks, and frontend utilities]
\`\`\`

\`\`\`mermaid
sequenceDiagram
%% FRONTEND SEQUENCE DIAGRAM - Component Interactions Only
[Your detailed frontend sequence diagram here with ONLY component interactions and API calls]
\`\`\`

\`\`\`mermaid
classDiagram
%% BACKEND CLASS DIAGRAM - Backend Services Only
[Your detailed backend class diagram here with ONLY controllers, services, and models]
\`\`\`

\`\`\`mermaid
sequenceDiagram
%% BACKEND SEQUENCE DIAGRAM - Service Interactions Only
[Your detailed backend sequence diagram here with ONLY service-to-service and database interactions]
\`\`\`

CRITICAL REQUIREMENTS:
- STRICTLY separate frontend and backend concerns
- Frontend diagrams: ONLY React components, hooks, context, frontend services
- Backend diagrams: ONLY controllers, services, models, database operations
- Include ALL relevant classes, methods, and relationships for each layer
- Show complete data flow and dependencies within each layer
- Use proper UML notation and Mermaid syntax
- Make diagrams production-ready and architecturally sound
- Focus on code generation needs (models, services, components, dependencies)`
                },
                {
                    role: "user",
                    content: `Generate separate, detailed frontend and backend UML diagrams for this system. Focus on code generation needs with complete architectural details: ${prompt}`
                }
            ],
            temperature: 0.3,
            max_tokens: 6000
        });
        // Parse all responses
        const basicDiagrams = parseUMLResponse(basicCompletion.choices[0].message.content || '');
        const componentDiagrams = parseUMLResponse(componentCompletion.choices[0].message.content || '');
        const separateDiagrams = parseUMLResponse(separateDiagramsCompletion.choices[0].message.content || '');
        // Combine all diagrams
        const allDiagrams = Object.assign(Object.assign(Object.assign({}, basicDiagrams), componentDiagrams), separateDiagrams);
        console.log("[UML Generator] Generated diagram types:", Object.keys(allDiagrams));
        return allDiagrams;
    }
    catch (error) {
        console.error("[UML Generator] Error generating UML diagrams:", error);
        throw error;
    }
});
exports.generateUmlFromPrompt = generateUmlFromPrompt;
function parseUMLResponse(response) {
    const diagrams = {};
    const regex = /```mermaid\s*([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(response)) !== null) {
        const content = match[1].trim();
        if (content.startsWith("classDiagram")) {
            // Determine if this is frontend or backend based on content
            const isFrontend = content.includes('React') || content.includes('Component') ||
                content.includes('Hook') || content.includes('Context') ||
                content.includes('useState') || content.includes('useEffect');
            const isBackend = content.includes('Controller') || content.includes('Service') ||
                content.includes('Model') || content.includes('Repository') ||
                content.includes('Database') || content.includes('API');
            if (isFrontend && !diagrams.frontendClass) {
                diagrams.frontendClass = content;
            }
            else if (isBackend && !diagrams.backendClass) {
                diagrams.backendClass = content;
            }
            else if (!diagrams.class) {
                diagrams.class = content;
            }
        }
        else if (content.startsWith("sequenceDiagram")) {
            // Determine if this is frontend or backend based on content
            const isFrontend = content.includes('User') && content.includes('Component') ||
                content.includes('React') || content.includes('Hook');
            const isBackend = content.includes('Controller') || content.includes('Service') ||
                content.includes('Database') || content.includes('API');
            if (isFrontend && !diagrams.frontendSequence) {
                diagrams.frontendSequence = content;
            }
            else if (isBackend && !diagrams.backendSequence) {
                diagrams.backendSequence = content;
            }
            else if (!diagrams.sequence) {
                diagrams.sequence = content;
            }
        }
        else if (content.startsWith("erDiagram")) {
            diagrams.entity = content;
        }
        else if (content.startsWith("flowchart")) {
            // Determine if this is frontend, backend, or architecture based on content
            const isFrontend = content.includes('Frontend') || content.includes('Component') ||
                content.includes('Page') || content.includes('UI');
            const isBackend = content.includes('Backend') || content.includes('Service') ||
                content.includes('Controller') || content.includes('API');
            const isArchitecture = content.includes('S3') || content.includes('Lambda') ||
                content.includes('DynamoDB') || content.includes('CloudFront');
            if (isFrontend && !diagrams.frontendComponent) {
                diagrams.frontendComponent = content;
            }
            else if (isBackend && !diagrams.backendComponent) {
                diagrams.backendComponent = content;
            }
            else if (isArchitecture && !diagrams.architecture) {
                diagrams.architecture = content;
            }
        }
        else if (content.startsWith("stateDiagram-v2")) {
            diagrams.state = content;
        }
        else if (content.startsWith("C4Context")) {
            diagrams.c4 = content;
        }
    }
    return diagrams;
}
