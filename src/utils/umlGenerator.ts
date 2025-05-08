import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface UMLDiagrams {
  sequence: string
  entity: string
  component: string
}

export const generateUmlFromPrompt = async (prompt: string) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are a UML diagram expert. Generate three UML diagrams in Mermaid syntax for the given system description.
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
          flowchart TB
          [Your component diagram here showing system architecture]
          \`\`\`

          Follow these rules:
          1. Use proper Mermaid syntax for each diagram type
          2. Include all essential components and relationships
          3. Keep diagrams clean and readable
          4. Use descriptive labels for relationships
          5. Return ONLY the diagrams with no additional text or explanations`
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

    console.log("[UML Generator] Received OpenAI response:", response);

    // Parse the response to extract different diagram types
    const diagrams: { [key: string]: string } = {
      sequence: "",
      entity: "",
      component: ""
    };
    
    // Extract diagrams based on Mermaid syntax markers
    const sections = response.split("```mermaid");
    console.log("[UML Generator] Split content into sections:", sections.length);

    sections.forEach((section) => {
      if (section.includes("sequenceDiagram")) {
        diagrams.sequence = section.split("```")[0].trim();
      } else if (section.includes("erDiagram")) {
        diagrams.entity = section.split("```")[0].trim();
      } else if (section.includes("architecture-beta")) {
        diagrams.component = section.split("```")[0].trim();
      }
    });

    console.log("[UML Generator] Extracted diagrams:", {
      types: Object.keys(diagrams),
      lengths: {
        sequence: diagrams.sequence.length,
        entity: diagrams.entity.length,
        component: diagrams.component.length,
      }
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
  sections.forEach(section => {
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