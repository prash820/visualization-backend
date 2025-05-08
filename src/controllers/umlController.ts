import { Request, Response } from 'express';
import { UmlDiagram } from '../models/umlDiagram';
import { generateUmlFromPrompt } from '../utils/umlGenerator';
import { OpenAI } from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export const generateUmlDiagrams = async (req: Request, res: Response) => {
  const { prompt } = req.body;
  console.log("[UML Controller] Generating diagrams for prompt:", prompt);

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are a UML diagram expert. Generate four UML diagrams in Mermaid syntax for the given system description.
          Return exactly three diagrams in this format:

          \`\`\`mermaid
          sequenceDiagram
          [Your sequence diagram here showing key system interactions and flow]
          \`\`\`

          \`\`\`mermaid
          erDiagram
          [Your entity relationship diagram here showing data model]
          \`\`\`

          \`\`\`mermaid
          architecture-beta
          [Your component diagram here showing system architecture]
          \`\`\`

          Follow these rules:
          1. Use proper Mermaid syntax for each diagram type
          2. Include all essential components and relationships
          3. Keep diagrams clean and readable
          4. Use descriptive labels and proper naming conventions:
             - Use snake_case for IDs
             - Use Title Case for labels
          5. For architecture diagrams (architecture-beta), follow this exact syntax:
             
             a. Diagram Type Declaration:
                - Start with: "architecture-beta"
                
             b. Group Definition:
                - Syntax: "group {group_id}({icon_name})[{title}]"
                - Example: "group api_gateway(cloud)[API Gateway]"
                - Example with AWS icon: "group lambda_group(logos:aws-lambda)[Lambda Functions]"
                - Components:
                  * "group" - keyword for group creation
                  * "{group_id}" - group identifier (use snake_case)
                  * "({icon_name})" - icon name (see Available Icons below)
                  * "[{title}]" - display name (use Title Case)
                
             c. Service Definition:
                - Syntax: "service {service_id}({icon_name})[{title}] in {group_id}"
                - Example: "service database1(database)[Primary Database] in db_group"
                - Example with AWS icon: "service user_lambda(logos:aws-lambda)[User Handler] in lambda_group"
                - Components:
                  * "service" - keyword for service creation
                  * "{service_id}" - service identifier (use snake_case)
                  * "({icon_name})" - icon name (see Available Icons below)
                  * "[{title}]" - display name (use Title Case)
                  * "in {group_id}" - REQUIRED parent group
                
             d. Edge Definition:
                - Syntax: "{service_id}:{direction} {arrow_type} {direction}:{service_id}"
                - Direction: T (top), B (bottom), L (left), R (right)
                - Arrow types: 
                  * "--" for undirected connection
                  * "-->" for directed connection
                - Examples:
                  * "database:L -- R:server"
                  * "lambda:R --> L:database"
                
             e. Available Icons:
                Option 1 - Generic Icons:
                * cloud
                * database
                * server
                * disk
                * internet

                Option 2 - AWS Service Icons:
                * logos:aws-lambda
                * logos:aws-aurora
                * logos:aws-s3
                * logos:aws-glacier
                * logos:aws-ec2
                * logos:aws-api-gateway
                * logos:aws-dynamodb
                * logos:aws-rds
                
             f. Example Diagrams:

                Example 1 (Generic Icons):
                \`\`\`mermaid
                architecture-beta
                    group api(cloud)[API Gateway]
                    group storage(disk)[Storage Layer]

                    service server1(server)[Primary Server] in api
                    service server2(server)[Backup Server] in api
                    service db(database)[Main Database] in storage
                    service backup(disk)[Backup Storage] in storage

                    server1:R --> L:db
                    server2:R --> L:db
                    db:B -- T:backup
                \`\`\`

                Example 2 (AWS Icons):
                \`\`\`mermaid
                architecture-beta
                    group api_layer(logos:aws-api-gateway)[API Gateway]
                    group compute_layer(logos:aws-lambda)[Compute Layer]
                    group data_layer(logos:aws-dynamodb)[Data Layer]

                    service gateway(logos:aws-api-gateway)[Main Gateway] in api_layer
                    service auth_lambda(logos:aws-lambda)[Auth Service] in compute_layer
                    service task_lambda(logos:aws-lambda)[Task Service] in compute_layer
                    service users_table(logos:aws-dynamodb)[Users Table] in data_layer
                    service tasks_table(logos:aws-dynamodb)[Tasks Table] in data_layer

                    gateway:R --> L:auth_lambda
                    gateway:R --> L:task_lambda
                    auth_lambda:R --> L:users_table
                    task_lambda:R --> L:tasks_table
                \`\`\`
                
             g. Important Rules:
                - ALWAYS place services within groups using "in group_id"
                - Use EITHER all generic icons OR all AWS icons, don't mix them
                - Maintain consistent naming (snake_case for IDs, Title Case for labels)
                - Use proper connection points (T/B/L/R)
                - Keep connections clean and readable
                - For Azure just use the generic icons (logos:microsoft-azure)
                - DO NOT use nested groups with "in" syntax for groups
                - DO NOT use curly braces {} for grouping
                - DO NOT use flowchart syntax
                - DO NOT use square brackets for nodes
                - DO NOT use direction statements
                - DO NOT connect groups to services
          6. Return ONLY the diagrams with no additional text or explanations`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    console.log("[UML Controller] Received OpenAI response:", response);

    // Parse the response to extract different diagram types
    const diagrams: { [key: string]: string } = {
      sequence: "",
      entity: "",
      component: "",
    };
    
    // Extract diagrams based on Mermaid syntax markers
    const sections = response.split("```mermaid");
    console.log("[UML Controller] Split content into sections:", sections.length);

    sections.forEach((section) => {
     if (section.includes("sequenceDiagram")) {
        diagrams.sequence = section.split("```")[0].trim();
      } else if (section.includes("erDiagram")) {
        diagrams.entity = section.split("```")[0].trim();
      } else if (section.includes("architecture-beta")) {
        diagrams.component = section.split("```")[0].trim();
      }
    });

    console.log("[UML Controller] Extracted diagrams:", {
      types: Object.keys(diagrams),
      lengths: {
        sequence: diagrams.sequence.length,
        entity: diagrams.entity.length,
        component: diagrams.component.length,
      }
    });

    res.json({ diagrams });
  } catch (error) {
    console.error('[UML Controller] Error generating UML diagrams:', error);
    res.status(500).json({ error: 'Failed to generate UML diagrams' });
  }
};

export const saveUmlDiagram = async (req: Request, res: Response) => {
  try {
    const { projectId, diagramType, diagramData } = req.body;
    
    if (!projectId || !diagramType || !diagramData) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const diagram = await UmlDiagram.create({
      projectId,
      diagramType,
      diagramData,
    });

    res.json(diagram);
  } catch (error) {
    console.error('Error saving UML diagram:', error);
    res.status(500).json({ error: 'Failed to save UML diagram' });
  }
};

export const getUmlDiagram = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const diagram = await UmlDiagram.findById(id);
    
    if (!diagram) {
      res.status(404).json({ error: 'UML diagram not found' });
      return;
    }

    res.json(diagram);
  } catch (error) {
    console.error('Error getting UML diagram:', error);
    res.status(500).json({ error: 'Failed to get UML diagram' });
  }
};

export const updateUmlDiagram = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { diagramData } = req.body;
    
    if (!diagramData) {
      res.status(400).json({ error: 'Diagram data is required' });
      return;
    }

    const diagram = await UmlDiagram.findByIdAndUpdate(
      id,
      { diagramData },
      { new: true }
    );

    if (!diagram) {
      res.status(404).json({ error: 'UML diagram not found' });
      return;
    }

    res.json(diagram);
  } catch (error) {
    console.error('Error updating UML diagram:', error);
    res.status(500).json({ error: 'Failed to update UML diagram' });
  }
};

export const deleteUmlDiagram = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const diagram = await UmlDiagram.findByIdAndDelete(id);
    
    if (!diagram) {
      res.status(404).json({ error: 'UML diagram not found' });
      return;
    }

    res.json({ message: 'UML diagram deleted successfully' });
  } catch (error) {
    console.error('Error deleting UML diagram:', error);
    res.status(500).json({ error: 'Failed to delete UML diagram' });
  }
}; 