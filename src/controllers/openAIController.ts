// src/controllers/openAIController.ts
import express from "express";
import { Request, Response,  } from "express";
import { OpenAI } from "openai";
import dotenv from "dotenv";
import Anthropic from '@anthropic-ai/sdk';
dotenv.config();
const router = express.Router();
export default router;

interface DiagramNode {
  id: string;
  label: string;
  group?: string;
  subgroup?: string;
}

interface DiagramEdge {
  source: string;
  target: string;
  label?: string;
}

interface DiagramGroup {
  id: string;
  label: string;
  parentGroup?: string;
}

interface ArchitectureResponse {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups: DiagramGroup[];
}


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_SECRET_KEY, // defaults to process.env["ANTHROPIC_API_KEY"]
});

export const generateVisualization = async (req: Request, res: Response) => {
  const { prompt, diagramType } = req.body;
  console.log("🔹 Prompt:", req.body);
  if (!prompt || !diagramType) {
    console.log("🔹 Missing required parameters.");
    return res.status(400).json({ error: "Missing required parameters." });
    
  }
  type DiagramType = "flowchart" | "architecture" | "sequence" | "uml";


  console.log(`[AI] Generating diagram for prompt: ${prompt} with diagramType: ${diagramType}`);

  const systemPrompt : Record<DiagramType, string> = {
    flowchart: `
                  You are an AI assistant specialized in generating flowcharts based on user prompts.
              Return only valid JSON with two arrays: "nodes" and "edges".
              Each node should have an "id", "label", "role", and a default position.
              Each edge should connect nodes using "sourceLabel", "targetLabel" and edge label that says what is happening between steps.
              Role means the type of node, like start/end, process, decision, input output, etc
              Do not include any extra text.          
      `,
    architecture: `You are an AI assistant specialized in generating **cloud architecture diagrams** based on user prompts.

### **🔹 User Query:** "<User's Input>"
### **🔹 Diagram Type:** "architecture"

## **🌟 Rules for Generating JSON Output**
1️⃣ **Group services under their respective cloud providers** (AWS, Azure, OCI).  
2️⃣ **If a cloud provider has a VPC, the services inside that VPC should be grouped inside it.**  
3️⃣ **Keep cloud providers as separate top-level groups**, even if services communicate between providers.  
4️⃣ **Ensure correct edge connections** between services, even across different providers.  
5️⃣ **Use proper hierarchical nesting** to reflect real-world cloud architectures.  

### **📌 Expected JSON Format** No Other text should be part of the response or no additional follow up questions

{
  "groups": [
    { "id": "aws-services", "label": "AWS Services" },
    { "id": "aws-vpc-1", "label": "AWS VPC 1", "parentGroup": "aws-services" },
    { "id": "azure-services", "label": "Azure Services" },
    { "id": "oci-services", "label": "OCI Services" }
  ],
  "nodes": [
    { "id": "api-gateway", "label": "API Gateway", "service": "api-gateway", "group": "aws-services" },
    { "id": "lambda-1", "label": "Lambda Function", "service": "lambda", "group": "aws-vpc-1" },
    { "id": "s3", "label": "S3 Storage", "service": "s3", "group": "aws-services" },
    { "id": "rds", "label": "RDS Database", "service": "rds", "group": "aws-services" },
    { "id": "azure-app-service", "label": "Azure Web App", "service": "app-service", "group": "azure-services" },
    { "id": "oci-object-storage", "label": "OCI Object Storage", "service": "object-storage", "group": "oci-services" }
  ],
  "edges": [
  { "source": "api-gateway", "target": "lambda-1", "label": "Invokes" },
  { "source": "lambda-1", "target": "s3", "label": "Stores Data" },
  { "source": "lambda-1", "target": "rds", "label": "Queries" },
  { "source": "azure-app-service", "target": "oci-object-storage", "label": "Writes To" }
]

}
`,
    sequence: `
          You are an AI assistant specialized in generating sequence diagrams based on user prompts.
        Return only valid JSON with two arrays: "nodes" and "edges".
        Nodes represent actors or steps, and edges represent the flow of interactions.
        Format example:
        {
          "nodes": [{ "label": "Actor or Step" }],
          "edges": [{ "sourceLabel": "Label", "targetLabel": "Label", "label": "Message" }]
        }
        Do not include any extra text.
      `,
    uml: `
                You are an AI assistant specialized in generating UML class diagrams based on user prompts.
                Return only valid JSON with two arrays: "nodes" and "edges".
                Each node represents a class (with a "label"), and edges represent relationships between classes.
                Format example:
                {
                  "nodes": [{ "label": "ClassName" }],
                  "edges": [{ "sourceLabel": "ClassName", "targetLabel": "ClassName", "label": "Relationship" }]
                }
                Do not include any extra text.
                      `
  };
  // Choose a system prompt based on diagramType
  try {
    console.log("User Prompt:", prompt);
    const response = await openai.chat.completions.create({
      model: "gpt-4-0125-preview",
      messages: [
        { role: "system", content: systemPrompt[diagramType as DiagramType] },
        { role: "user", content: prompt },
      ],
      max_tokens: 4096,
      temperature: 0.5,
    });


    const fullResponse = response.choices[0]?.message?.content || "";
    switch (diagramType)  {
      case "architecture" : {
        const parsedData = parseArchitectureResponse(fullResponse);
        return res.json(parsedData);
      }
      default : {
        const parseData = parseGenericResponse(fullResponse);
        return res.json(parseData);
      }
    }

  } catch (error) {
    console.error("Error generating visualization:", error);
    return res.status(500).json({ error: "Failed to generate diagram." });
  }
};

export const generateIaC = async (req: Request, res: Response) => {
  const { nodes, edges, format } = req.body; // ✅ Ensure these values exist

  if (!nodes?.length || !edges?.length || !format) {
    console.error("❌ Missing parameters:", { nodes, edges, format });
    return res.status(400).json({ error: "Missing required parameters." });
  }

  console.log(`[AI] Generating ${format.toUpperCase()} code for architecture diagram`);

  const systemPrompt = 
`You are an expert in Infrastructure as Code (IaC) with deep knowledge of Terraform, AWS provider constraints (v5.92+) and production-grade resource configurations.

Your task is to generate only valid and production-ready ${format.toUpperCase()} code based on the given architecture diagram.

STRICT INSTRUCTIONS:
- Output must be only raw ${format.toUpperCase()} code — no explanations, markdown, comments, or formatting hints.
- Do not include backticks or wrap the code in code blocks.
- Do not include phrases like "Here is the code", etc.
- The output must be directly usable in a main.tf file without any manual editing.

HARD RULES TO FOLLOW:

GENERAL REQUIREMENTS:
- Use region = "us-west-2" in the provider block.
- Use only Terraform v1.5.7+ compatible syntax and AWS provider v5.92+ compliant resources.
- All resource references must use proper Terraform interpolation (e.g., {resource.type.name.attribute}).

DO NOT USE:
- acl or aws_s3_bucket_acl on S3 buckets with object_ownership = "BucketOwnerEnforced" (this will fail).
- name in aws_db_instance — use identifier instead.
- Hardcoded AMI IDs — use data "aws_ami" to fetch the latest Amazon Linux 2 image.
- aws_api_gateway_v2_integration — the correct type is aws_apigatewayv2_integration.
- nodejs14.x or older runtimes — use nodejs18.x or newer.
- Overlapping subnet CIDRs — ensure all subnet CIDRs are unique.

MANDATORY INCLUSIONS:
- For aws_db_instance, always set skip_final_snapshot = true unless final_snapshot_identifier is provided.
- For aws_s3_bucket, set object_ownership = "BucketOwnerEnforced" and omit ACLs entirely.
- For EC2, use data "aws_ami" to dynamically fetch images.
- Use random_id from the random provider if uniqueness is needed — and include the required_providers block.
- All required attributes must be included and valid for every resource.

S3 BUCKET NAMING RULE:
- Bucket names must be globally unique. Use a suffix like my-bucket-{random_id.suffix.hex}.

VALIDATION:
- The code must pass terraform validate and terraform apply without errors.
- The code must be 100% usable as-is in main.tf — no manual intervention required.

Input:
Nodes: ${JSON.stringify(nodes, null, 2)}
Edges: ${JSON.stringify(edges, null, 2)}

Expected Output:
Only raw ${format.toUpperCase()} code implementing the infrastructure described.
`;

  try {

    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      messages: [
        { role: "user", content: systemPrompt },
      ],
      max_tokens: 11700,
      temperature: 0.5,
    });
    

    // ✅ Safely Extract the AI Response
    const fullResponse = response.content?.[0] && 
    'type' in response.content[0] && 
    response.content[0].type === 'text' &&
    'text' in response.content[0]
      ? response.content[0].text 
      : '';
    const stripped = fullResponse.replace(/```[a-z]*|```/g, "").trim();

    console.log("✅ AI IaC Response:", fullResponse);
    
    res.json({ code: stripped });
  } catch (error) {
    console.error("❌ Error generating IaC:", error);
    return res.status(500).json({ error: "Failed to generate IaC." });
  }
};

const parseArchitectureResponse = (response: string): ArchitectureResponse => {
  try {
    console.log("[AI RAW RESPONSE]:", response);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid JSON format received from AI.");
    }

    const parsedData: ArchitectureResponse = JSON.parse(jsonMatch[0]);

    if (!parsedData.nodes || !parsedData.edges || !parsedData.groups) {
      throw new Error("Missing required keys (nodes, edges, groups) in AI response.");
    }

    // ✅ Ensure every node has a valid group
    parsedData.nodes.forEach((node: DiagramNode) => {
      if (!node.group) {
        throw new Error(`Node "${node.label}" is missing a group!`);
      }
    });

    console.log("Parsed data : ", parsedData);

    return parsedData;
  } catch (error) {
    console.error("Error parsing AI response:", error);
    throw new Error("Invalid architecture response format");
  }
};

const parseGenericResponse = (response: string) => {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid JSON format");

    const diagramJson = JSON.parse(jsonMatch[0]);
    
    if (!diagramJson.nodes || !diagramJson.edges) {
      throw new Error("Missing nodes or edges in response");
    }

    return diagramJson;
  } catch (error) {
    console.error("Error parsing AI response:", error);
    throw new Error("Invalid generic diagram response format");
  }
};
