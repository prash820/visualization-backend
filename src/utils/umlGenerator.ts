import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface UMLDiagrams {
  class?: string;
  sequence?: string;
  entity?: string;
  component?: string;
}

export const generateUmlFromPrompt = async (prompt: string): Promise<UMLDiagrams> => {
  try {
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
    }
  }
  return diagrams;
} 