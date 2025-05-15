import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export interface UMLDiagrams {
  class?: string;
  sequence?: string;
  entity?: string;
  component?: string;
}

export const generateUmlFromPrompt = async (prompt: string): Promise<UMLDiagrams> => {
  try {
    const completion = await openai.createChatCompletion({
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
          erDiagram
          [Your entity relationship diagram here showing data model]
          \`\`\`

          \`\`\`mermaid
          flowchart TB
          [Your component diagram here showing system architecture]
          \`\`\`

          Follow these rules:
          1. Use proper Mermaid syntax for each diagram type
          2. Include all essential components and relationships
          3. Keep diagrams clean and readable
          4. Use descriptive labels for relationships
          5. Return ONLY the diagrams with no additional text or explanations
          6. Generate all diagram types that are relevant to the system description`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    const response = completion.data.choices[0].message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    console.log("[UML Generator] Received OpenAI response:", response);

    // Parse the response to extract different diagram types
    const diagrams: UMLDiagrams = {};
    
    // Extract diagrams based on Mermaid syntax markers
    const sections = response.split("```mermaid");
    console.log("[UML Generator] Split content into sections:", sections.length);

    sections.forEach((section: string) => {
      if (section.includes("classDiagram")) {
        diagrams.class = section.split("```")[0].trim();
      } else if (section.includes("sequenceDiagram")) {
        diagrams.sequence = section.split("```")[0].trim();
      } else if (section.includes("erDiagram")) {
        diagrams.entity = section.split("```")[0].trim();
      } else if (section.includes("flowchart")) {
        diagrams.component = section.split("```")[0].trim();
      }
    });

    console.log("[UML Generator] Extracted diagrams:", {
      types: Object.keys(diagrams),
      lengths: Object.fromEntries(
        Object.entries(diagrams).map(([key, value]) => [key, value?.length || 0])
      )
    });

    return diagrams;
  } catch (error) {
    console.error('[UML Generator] Error generating UML diagrams:', error);
    throw error;
  }
};

export function parseUMLResponse(response: string): UMLDiagrams {
  const diagrams: UMLDiagrams = {
    sequence: "",
    entity: "",
    component: ""
  }

  const sections = response.split("```mermaid")
  sections.forEach((section: string) => {
    if (section.includes("sequenceDiagram")) {
      diagrams.sequence = section.split("```")[0].trim()
    } else if (section.includes("erDiagram")) {
      diagrams.entity = section.split("```")[0].trim()
    } else if (section.includes("architecture-beta")) {
      diagrams.component = section.split("```")[0].trim()
    }
  })

  return diagrams
} 