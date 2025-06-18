import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface UMLDiagrams {
  class?: string;
  sequence?: string;
  entity?: string;
  component?: string;
  architecture?: string;
}

const getAwsLogoNames = (): string => {
  try {
    const logoPath = path.join(__dirname, 'aws-logo-names.txt');
    const logoContent = fs.readFileSync(logoPath, 'utf-8');
    return logoContent.split('\n')
      .filter(line => line.trim() && !line.startsWith('//'))
      .join('\n');
  } catch (error) {
    console.error('[UML Generator] Error reading AWS logo names:', error);
    return '';
  }
};

export const generateUmlFromPrompt = async (prompt: string): Promise<UMLDiagrams> => {
  try {
    const awsLogoNames = getAwsLogoNames();
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are a UML diagram expert. Generate comprehensive UML diagrams in Mermaid syntax for the given system description.
          Return all diagrams in this format:

          \`\`\`mermaid
          classDiagram
          [Your class diagram here showing class relationships and attributes]
          \`\`\`

          \`\`\`mermaid
          sequenceDiagram
          [Your sequence diagram here showing key system interactions and flow]
          \`\`\`

          \`\`\`mermaid
          flowchart TB
          [Your component diagram here showing system architecture]
          \`\`\`

           \`\`\`mermaid
          architecture-beta
          [Your architecture diagram here showing AWS services and infrastructure]
          \`\`\`

          Diagram Type Guidelines:

          1. Class Diagram Rules:
             Class diagrams represent the structure of software classes, their properties, methods, and relationships. When using Mermaid, follow these rules:

            Use the correct declaration: Start with classDiagram.

            Define classes using the class ClassName syntax. Use PascalCase for class names.

            Properties and methods:

            Use + for public, - for private, # for protected.

            Syntax: +propertyName: Type, +methodName(param: Type): ReturnType

            Relationships:

            Inheritance: ClassA <|-- ClassB

            Association: ClassA --> ClassB

            Aggregation: ClassA o-- ClassB

            Composition: ClassA *-- ClassB

            Dependency: ClassA ..> ClassB

            Use class blocks to define attributes and methods inline:

            \`\`\`mermaid
            class User {
              +id: int
              +name: string
              +login(): boolean
            }
            \`\`\`
            Keep labels short and meaningful. Avoid generic names like Class1, DataModel.

            Example:

            \`\`\`mermaid
            classDiagram
              class User {
                +id: int
                +name: string
                +login(): boolean
              }
              class Admin {
                +accessLevel: int
              }
              User <|-- Admin
            \`\`\`
            Use this format to create readable and consistent object-oriented diagrams.

          2. Sequence Diagram Rules:
            Sequence diagrams show how objects or components interact over time. Follow these rules when generating them using Mermaid:

            Use the correct declaration: Start with sequenceDiagram.

            Define participants using participant, actor, or autonumber for labeled steps.

            Message syntax:

            Synchronous: A->>B: Message

            Asynchronous: A->>+B: Start Call

            Response/Return: B-->>A: Response

            Activation: activate B / deactivate B

            Use Note to annotate timelines:

            Note right of A: note content

            Note over A,B: shared note

            Avoid unnecessary actors. Label each participant with a meaningful name (e.g., User, AuthService, DB).

            Indicate lifelines properly and avoid bidirectional confusion.

            Example:

            \`\`\`mermaid
            sequenceDiagram
              participant User
              participant WebApp
              participant API
              participant DB

              User->>WebApp: Clicks Login
              WebApp->>API: Sends Credentials
              API->>DB: Query User
              DB-->>API: User Data
              API-->>WebApp: Auth Token
              WebApp-->>User: Login Successful
            \`\`\`
            Use this format for readable, time-ordered interaction flows between components.

          3. Component Diagram Rules:
             Component diagrams help visualize the structure and interactions between software components in a system. The following rules should be followed when generating component diagrams using Mermaid syntax.

              Use the correct Mermaid declaration: Start with flowchart TB for top-down or flowchart LR for left-to-right layout.

              Group related components using subgraph: Subgraphs logically group components like Frontend, Backend, or Storage. Do not nest subgraphs. Use Title Case for subgraph names.

              Node types:

              Components: Represent using square brackets, e.g., [User Service]. Use short, descriptive, and Title Case labels.

              Interfaces (optional): Use parentheses, e.g., (User API), to show exposed interfaces.

              External systems/databases (optional): Also use [Label], and distinguish using naming or placement in dedicated subgraphs.

              Connection types (dependencies):

              --> for direct dependency. Example: [Client App] --> [API Gateway]

              -.-> for optional or indirect dependency. Example: [Service A] -.-> [Cache Layer]

              ==>> for strong or event-based dependency. Example: [Order Service] ==>> [Event Stream]

              Layout tips: Choose TB or LR for directional clarity. Use subgraphs to separate frontends, backends, databases, and third-party services. Maintain logical flow (e.g., clients → APIs → services → databases).

              Naming conventions: Use meaningful, concise names like Auth Service or Event Broker. Avoid vague labels like System 1.

              Example:

              \`\`\`mermaid
              flowchart TB
                subgraph Frontend
                  [Web App]
                  [Mobile App]
                end
                subgraph Backend
                  [API Gateway]
                  [Auth Service]
                  [User Service]
                  [Notification Service]
                end
                subgraph Storage
                  [PostgreSQL Database]
                  [S3 Bucket]
                end
                subgraph Auth
                  [Cognito]
                end
                [Web App] --> [API Gateway]
                [Mobile App] --> [API Gateway]
                [API Gateway] --> [Auth Service]
                [API Gateway] --> [User Service]
                [API Gateway] --> [Notification Service]
                [User Service] --> [PostgreSQL Database]
                [Notification Service] --> [S3 Bucket]
                [Auth Service] --> [Cognito]
                \`\`\`
              Use this structure to ensure clarity, maintainability, and visual consistency across all generated component diagrams.

          4. Architecture Diagram Rules:

          \`\`\`mermaid
          architecture-beta
          [Focus on AWS infrastructure. The architecture diagram should show the AWS services, resources, and networking required to deploy and run the system. Use AWS-specific services (e.g., Lambda, S3, RDS, VPC, API Gateway, etc), icons, and groupings.

          ⚠️ CRITICAL RULES - READ FIRST:
          1. Edge Directions:
             - EVERY edge MUST specify directions on BOTH sides
             - Format: serviceA:L --> R:serviceB
             - Valid directions: L (Left), R (Right), T (Top), B (Bottom)
             - ❌ INVALID: serviceA --> serviceB (missing directions)
             - ❌ INVALID: serviceA:L --> serviceB (missing second direction)
             - ✅ VALID: serviceA:L --> R:serviceB (both directions specified)

          2. Group Connections:
             - Groups CANNOT be connected directly
             - If you need to connect to a group, you MUST:
               1. Define a service inside that group
               2. Connect to that service instead
             - ❌ INVALID: serviceA --> groupB (connecting to group)
             - ❌ INVALID: groupA --> groupB (connecting groups)
             - ✅ VALID: serviceA:L --> R:serviceB (where serviceB is in a group)

          3. Service Requirements:
             - Every group that needs to be connected MUST have at least one service
             - Every service should have at least one connection
             - Services should be named descriptively (e.g., auth_service, payment_service)

          Official Mermaid Examples:

          1. Basic Group and Service Structure:
          \`\`\`mermaid
          architecture-beta
              group api(cloud)[API]
                  service db(database)[Database] in api
                  service disk1(disk)[Storage] in api
                  service disk2(disk)[Storage] in api
                  service server(server)[Server] in api

              db:L -- R:server
              disk1:T -- B:server
              disk2:T -- B:db
          \`\`\`

          2. Nested Groups and Services:
          \`\`\`mermaid
          architecture-beta
              group public_api(cloud)[Public API]
                  group private_api(cloud)[Private API] in public_api
                      service db(database)[Database] in private_api
                  service gateway(internet)[Gateway] in public_api
              service client(server)[Client]

              client:R --> L:gateway
              gateway:R --> L:db
          \`\`\`

          3. Using Junctions for Complex Routing:
          \`\`\`mermaid
          architecture-beta
              service left_disk(disk)[Disk]
              service top_disk(disk)[Disk]
              service bottom_disk(disk)[Disk]
              service top_gateway(internet)[Gateway]
              service bottom_gateway(internet)[Gateway]
              junction junctionCenter
              junction junctionRight

              left_disk:R -- L:junctionCenter
              top_disk:B -- T:junctionCenter
              bottom_disk:T -- B:junctionCenter
              junctionCenter:R -- L:junctionRight
              top_gateway:B -- T:junctionRight
              bottom_gateway:T -- B:junctionRight
          \`\`\`

          4. AWS Services with Custom Icons:
          \`\`\`mermaid
          architecture-beta
              group api(logos:aws-lambda)[API]
                  service db(logos:aws-aurora)[Database] in api
                  service disk1(logos:aws-glacier)[Storage] in api
                  service disk2(logos:aws-s3)[Storage] in api
                  service server(logos:aws-ec2)[Server] in api

              db:L -- R:server
              disk1:T -- B:server
              disk2:T -- B:db
          \`\`\`

          Now, proceed with the rest of the architecture diagram rules:

          1. Basic Structure:
             - Start with 'architecture-beta'
             - Define groups first, then services, then edges
             - Use proper indentation for readability

          2. Groups:
             - Syntax: group {group_id}({icon})[{title}] (in {parent_id})?
             - Example: group api(cloud)[API]
             - For nested groups: group private_api(cloud)[Private API] in public_api
             - Use appropriate icons: cloud, database, disk, internet, server

          3. Services:
             - Syntax: service {service_id}({icon})[{title}] (in {parent_id})?
             - Example: service db(database)[Database] in api
             - Place services in appropriate groups
             - Use descriptive labels and appropriate icons

          4. Edges:
             - T=Top, B=Bottom, L=Left, R=Right
             - Example: db:L -- R:server
             - For arrows: db:L --> R:server
             - Choose edge directions to minimize line crossings
             - Prefer consistent edge directions for main flow

          5. Icons:
             - Default icons: cloud, database, disk, internet, server
             - Use appropriate icons for each service type
             - For cloud services, use specific icons from the following list:
             ${awsLogoNames}]
          \`\`\`

          Follow these rules:
          1. Use proper Mermaid syntax
          2. Include all essential components
          3. Keep diagrams clean and readable
          4. Use descriptive labels
          5. Return ONLY the diagrams
          6. Generate all relevant diagram types
          7. NEVER connect groups directly
          8. ALWAYS connect services to services
          9. ALWAYS specify both edge directions
          10. Show complete data flow through the system

          ⚠️ IMPORTANT: Since this is an AWS-based application, you MUST ALWAYS include an architecture-beta diagram showing the AWS infrastructure, even if the user doesn't explicitly request it. The architecture diagram should show:
          - How the application is deployed on AWS
          - The AWS services used
          - The networking between services
          - The data flow through the system
          - The monitoring and observability setup

          When generating the architecture-beta diagram:
          - Arrange the main services and data flow in a clear, logical order (preferably left-to-right or top-to-bottom).
          - Minimize edge crossings and overlaps.
          - Place the primary workflow as a straight line or gentle curve, with auxiliary or supporting services (such as monitoring, external APIs, or AI engines) positioned above, below, or to the side of the main flow.
          - Group related services together for clarity.
          - Use appropriate AWS icons and groupings.
          - Ensure the diagram is compact, visually balanced, and easy to understand for both technical and non-technical stakeholders.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.5,
    });

    const response = completion.choices[0].message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    console.log("[UML Generator] Received OpenAI response:", response);

    // Use the robust parser
    const diagrams = parseUMLResponse(response);
    console.log("[UML Generator] Parsed diagrams:", diagrams);
    return diagrams;
  } catch (error) {
    console.error('[UML Generator] Error generating UML diagrams:', error);
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
      diagrams.class = content;
    } else if (content.startsWith("sequenceDiagram")) {
      diagrams.sequence = content;
    } else if (content.startsWith("erDiagram")) {
      diagrams.entity = content;
    } else if (content.startsWith("flowchart")) {
      diagrams.component = content;
    } else if (content.startsWith("architecture-beta")) {
      diagrams.architecture = content;
    }
  }
  return diagrams;
} 