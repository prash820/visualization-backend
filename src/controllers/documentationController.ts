import { Request, Response } from 'express';
import OpenAI from 'openai';
import { DesignDocument } from '../utils/projectFileStore';
import fs from 'fs/promises';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
  timeout: 240000, // 4 minutes timeout for OpenAI API calls
});

const MAX_RETRIES = 3;

// Define the expected structure based on the template
const TEMPLATE_STRUCTURE = {
  metadata: {
    required: ['title', 'authors', 'date_created', 'date_updated', 'reviewers', 'version', 'status', 'document_scope'],
    type: 'object'
  },
  executive_summary: {
    required: [],
    type: 'string'
  },
  goals: {
    required: ['goals_list', 'non_goals_list'],
    type: 'object'
  },
  background_context: {
    required: [],
    type: 'string'
  },
  requirements: {
    required: ['functional', 'non_functional', 'regulatory_compliance'],
    type: 'object'
  },
  proposed_architecture: {
    required: ['high_level_architecture_diagram', 'components', 'data_models', 'external_integrations'],
    type: 'object'
  },
  detailed_design: {
    required: ['sequence_diagrams', 'algorithms', 'modules_classes', 'concurrency_model', 'retry_idempotency_logic'],
    type: 'object'
  },
  api_contracts: {
    required: ['api_type', 'endpoints', 'request_response_format', 'error_handling', 'versioning_strategy'],
    type: 'object'
  },
  deployment_infrastructure: {
    required: ['environment_setup', 'iac_outline', 'ci_cd_strategy', 'feature_flags', 'secrets_configuration'],
    type: 'object'
  },
  observability_plan: {
    required: ['logging', 'metrics', 'tracing', 'dashboards', 'alerting_rules'],
    type: 'object'
  },
  security_considerations: {
    required: ['threat_model', 'encryption', 'authentication_authorization', 'secrets_handling', 'security_reviews_required'],
    type: 'object'
  },
  failure_handling_resilience: {
    required: ['failure_modes', 'fallbacks_retries', 'graceful_degradation', 'disaster_recovery'],
    type: 'object'
  },
  cost_estimation: {
    required: ['infrastructure', 'third_party_services', 'storage_bandwidth'],
    type: 'object'
  },
  risks_tradeoffs: {
    required: [],
    type: 'array'
  },
  alternatives_considered: {
    required: [],
    type: 'array'
  },
  rollout_plan: {
    required: ['strategy', 'data_migration', 'stakeholder_communication', 'feature_flags_usage'],
    type: 'object'
  },
  post_launch_checklist: {
    required: ['health_checks', 'regression_coverage', 'load_testing', 'ownership_and_runbooks'],
    type: 'object'
  },
  open_questions: {
    required: [],
    type: 'array'
  },
  appendix: {
    required: ['external_links', 'reference_docs', 'terminology'],
    type: 'object'
  }
};

export const generateDocumentation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt, umlDiagrams } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    // Set response headers for long-running request
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Send initial response to keep connection alive
    res.write(JSON.stringify({ status: 'processing', message: 'Generating documentation...' }));

    const designDoc = await generateDesignDocument(prompt, umlDiagrams);
    
    // Send the final response
    res.write(JSON.stringify({ status: 'complete', data: designDoc }));
    res.end();
  } catch (error) {
    console.error('Error generating design document:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate design document' });
    } else {
      res.write(JSON.stringify({ status: 'error', error: 'Failed to generate design document' }));
      res.end();
    }
  }
};

async function generateDesignDocument(
  prompt: string,
  umlDiagrams: any,
  retryCount = 0
): Promise<DesignDocument> {
  // Read the template file from the dist directory
  const templatePath = path.join(__dirname, '../../dist/templates/designDocumentTemplate.json');
  const templateContent = await fs.readFile(templatePath, 'utf-8');
  const template = JSON.parse(templateContent);

  const systemPrompt = `You are an expert software architect. Generate a comprehensive design document for the following application.

The audience is technical stakeholders and engineers who will use this document for implementation and maintenance.

IMPORTANT: You MUST follow the exact template structure provided. Your response must be a valid JSON object that matches the template structure exactly, including ALL required sections and their subsections.

Required Sections and Their Structure:
${Object.entries(TEMPLATE_STRUCTURE).map(([section, details]) => `
${section}:
- Type: ${details.type}
${details.required.length > 0 ? `- Required fields: ${details.required.join(', ')}` : ''}
`).join('\n')}

Guidelines:
1. Structure:
   - Each section MUST follow its specified format exactly
   - All required fields must be present and properly filled
   - Use consistent formatting within each section
   - Maintain proper nesting and hierarchy
   - Follow the exact structure from the template

2. Content:
   - Use clear, concise, and technical language
   - Focus on facts and best practices
   - Include specific examples and use cases
   - Use markdown formatting for better readability
   - Do NOT include or mention any diagrams; these will be inserted automatically

3. Formatting:
   - Use bullet points for lists
   - Use tables for structured data
   - Use code blocks for technical specifications
   - Use headers for subsections
   - Maintain consistent indentation

4. Quality:
   - Each section should be self-contained
   - Information should be specific and actionable
   - Include concrete examples where relevant
   - Ensure technical accuracy
   - Maintain professional tone

Template Structure:
${JSON.stringify(template, null, 2)}

Your response MUST be a valid JSON object that exactly matches this structure and includes ALL required sections with their specified fields. Do not include any text before or after the JSON object.`;

  console.log('[generateDesignDocument] Calling OpenAI with prompt and UML diagrams...');

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Application Description: ${prompt}\n\nUML Diagrams: ${JSON.stringify(umlDiagrams)}` }
    ],
    temperature: 0.2, // Reduced temperature for more consistent output
    max_tokens: 4000,
    response_format: { type: "json_object" } // Force JSON response
  });

  let content = response.choices[0].message?.content || '';
  console.log('[generateDesignDocument] AI response preview:', content.split('\n').slice(0, 2).join('\n'));

  try {
    const jsonString = content.replace(/```json|```/g, '').trim();
    const designDoc = JSON.parse(jsonString);
    
    // Validate that all required sections and their fields are present
    const missingSections = Object.entries(TEMPLATE_STRUCTURE)
      .filter(([section, details]) => {
        if (!designDoc[section]) return true;
        if (details.type === 'object' && details.required.length > 0) {
          return details.required.some(field => !designDoc[section][field]);
        }
        return false;
      })
      .map(([section]) => section);

    if (missingSections.length > 0) {
      if (retryCount < MAX_RETRIES) {
        console.log(`[generateDesignDocument] Missing sections or fields detected. Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        return generateDesignDocument(prompt, umlDiagrams, retryCount + 1);
      }
      throw new Error(`Missing required sections or fields: ${missingSections.join(', ')}`);
    }

    // Add metadata if not present
    if (!designDoc.metadata) {
      designDoc.metadata = {
        title: "System Design Document",
        authors: ["AI Assistant"],
        date_created: new Date().toISOString(),
        date_updated: new Date().toISOString(),
        reviewers: [],
        version: "1.0",
        status: "Draft",
        document_scope: "Complete system design and implementation details"
      };
    }

    return designDoc;
  } catch (e: unknown) {
    console.error('[generateDesignDocument] Failed to parse AI JSON response:', e);
    if (retryCount < MAX_RETRIES) {
      console.log(`[generateDesignDocument] Error occurred. Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
      return generateDesignDocument(prompt, umlDiagrams, retryCount + 1);
    }
    throw new Error('Failed to parse AI JSON response: ' + (e instanceof Error ? e.message : String(e)));
  }
} 