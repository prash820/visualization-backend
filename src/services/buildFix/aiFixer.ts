import { openai, OPENAI_MODEL, anthropic, ANTHROPIC_MODEL } from '../../config/aiProvider';
import { FixRequest, AIFixResult } from './types';
import fs from 'fs/promises';
import path from 'path';

export async function generateAIFix(fixRequest: FixRequest, jobId: string): Promise<AIFixResult> {
  const { error, relevantCode, context, targetDirectory, projectPath } = fixRequest;

  // Load code plan structure to provide context
  let codePlanContext = '';
  try {
    const backendCodePlanPath = path.join(projectPath, 'backend-codeplan.json');
    const frontendCodePlanPath = path.join(projectPath, 'frontend-codeplan.json');
    
    let backendCodePlan = null;
    let frontendCodePlan = null;
    
    try {
      const backendContent = await fs.readFile(backendCodePlanPath, 'utf-8');
      backendCodePlan = JSON.parse(backendContent);
    } catch (error) {
      // Backend code plan not found
    }
    
    try {
      const frontendContent = await fs.readFile(frontendCodePlanPath, 'utf-8');
      frontendCodePlan = JSON.parse(frontendContent);
    } catch (error) {
      // Frontend code plan not found
    }
    
    if (backendCodePlan?.fileStructure?.backend) {
      codePlanContext += `\n**BACKEND FILE STRUCTURE:**\n`;
      for (const file of backendCodePlan.fileStructure.backend) {
        codePlanContext += `- ${file.path} (${file.type}): ${file.description}\n`;
        if (file.dependencies?.length > 0) {
          codePlanContext += `  Dependencies: ${file.dependencies.join(', ')}\n`;
        }
      }
    }
    
    if (frontendCodePlan?.fileStructure?.frontend) {
      codePlanContext += `\n**FRONTEND FILE STRUCTURE:**\n`;
      for (const file of frontendCodePlan.fileStructure.frontend) {
        codePlanContext += `- ${file.path} (${file.type}): ${file.description}\n`;
        if (file.dependencies?.length > 0) {
          codePlanContext += `  Dependencies: ${file.dependencies.join(', ')}\n`;
        }
      }
    }
  } catch (error) {
    // Code plan loading failed, continue without it
  }

  const prompt = `You are an expert software developer fixing build errors in a TypeScript/Node.js project.

**ERROR:** ${error.message}
**TYPE:** ${error.type}
**CODE:** ${error.code || 'unknown'}
**SEVERITY:** ${error.severity}

**CONTEXT:**
${context}

**RELEVANT CODE:**
${relevantCode}

**TARGET DIRECTORY:** ${targetDirectory}

**PROJECT STRUCTURE CONTEXT:**
${codePlanContext}

**TASK:** Fix the build error comprehensively.

**FILE PATH REQUIREMENTS:**
- Use the existing file structure from the code plan above EXACTLY as defined
- If creating new files, follow the same patterns as existing files in the code plan
- **CRITICAL**: All file paths must match the code plan structure exactly
- **CRITICAL**: Do NOT assume any specific folder structure (no hardcoded backend/src/, backend/, etc.)
- **CRITICAL**: Use the actual file paths from the code plan as the source of truth
- **CRITICAL**: NEVER create files at the project root level
- **CRITICAL**: Backend files MUST be within the backend/ directory structure
- DO NOT create duplicate structures or assume folder hierarchies

**CODE PLAN-DRIVEN STRUCTURE:**
- Backend files should use the exact paths from the code plan's backend fileStructure
- Frontend files should use the exact paths from the code plan's frontend fileStructure
- **CRITICAL**: All backend files MUST be prefixed with "backend/" in the file paths
- **CRITICAL**: If code plan shows "index.ts", use "backend/index.ts" for backend files
- **CRITICAL**: If code plan shows "NotesController.ts", use "backend/NotesController.ts" for backend files
- If the code plan shows flat structure (e.g., "index.ts", "ControllerName.ts"), use that WITH backend/ prefix
- If the code plan shows nested structure (e.g., "src/index.ts", "controllers/ControllerName.ts"), use that WITH backend/ prefix
- The code plan is the single source of truth for file organization

**CORRECT FILE PATH EXAMPLES (based on actual code plan):**
- Use the exact paths from the code plan above WITH backend/ prefix for backend files
- If code plan shows "index.ts", use "backend/index.ts"
- If code plan shows "NotesController.ts", use "backend/NotesController.ts"
- If code plan shows "src/controllers/ControllerName.ts", use "backend/src/controllers/ControllerName.ts"

**INCORRECT APPROACH (DO NOT DO):**
- ❌ Assuming all files should be in "backend/src/"
- ❌ Assuming all files should be flat at "backend/"
- ❌ Hardcoding any folder structure
- ❌ Not following the code plan structure exactly
- ❌ Creating files at project root level
- ❌ Creating files outside the backend/ directory for backend files
- ❌ Using "index.ts" instead of "backend/index.ts" for backend files

**BACKEND ENTRY POINT REQUIREMENTS:**
- Use the exact entry point path from the code plan
- If code plan shows "index.ts", use "index.ts"
- If code plan shows "src/index.ts", use "src/index.ts"
- The code plan defines the correct entry point location

**REQUIREMENTS:**
1. Fix ALL errors mentioned in the context
2. Provide COMPLETE corrected file content (not partial fixes)
3. If creating new files, provide COMPLETE file content with proper imports
4. If updating package.json, add missing dependencies to correct section
5. For @types packages, add to devDependencies
6. Ensure all TypeScript types are properly defined
7. Follow TypeScript/Node.js best practices
8. **CRITICAL**: Ensure backend/src/index.ts exists and is properly configured
9. **CRITICAL**: All file paths must start with 'backend/' or 'frontend/'
10. **CRITICAL**: Follow the existing file structure patterns from the code plan

**FIXING GUIDELINES:**
- Type errors: Use interfaces or 'typeof' appropriately
- Import/export mismatches: Check default vs named exports
- Missing @types: Add to devDependencies in package.json
- Missing files: Create complete files with proper imports/exports
- Class property errors: Ensure the class has the required properties/methods
- Missing index.ts: Create a complete Express/Lambda entry point
- Follow existing dependency patterns from the code plan

**RESPONSE FORMAT:**
Return ONLY valid JSON:
{
  "success": true/false,
  "fixedContent": {
    "[EXACT_PATH_FROM_CODE_PLAN]": "COMPLETE corrected content"
  },
  "newFiles": {
    "[EXACT_PATH_FROM_CODE_PLAN]": "COMPLETE new file content"
  },
  "explanation": "brief explanation"
}

**CRITICAL PATH RULES:**
- Use EXACTLY the file paths from the code plan above
- If code plan shows "backend/index.ts", use "backend/index.ts"
- If code plan shows "index.ts", use "index.ts"
- If code plan shows "src/controllers/ControllerName.ts", use "src/controllers/ControllerName.ts"
- DO NOT create paths that don't exist in the code plan
- DO NOT assume any folder structure not shown in the code plan
- The code plan is the ONLY source of truth for file locations

Return only the JSON response, no explanations outside JSON.`;

  try {
    // Try OpenAI first, then Anthropic as fallback
    let response;
    let aiResponse = '';
    try {
      response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000,
        temperature: 0.3,
      });
      const content = response.choices[0]?.message?.content;
      if (content) {
        aiResponse = content;
        try {
          return JSON.parse(content);
        } catch (parseError) {
          // Try to extract JSON from markdown code fences
          const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            const jsonContent = jsonMatch[1].trim();
            return JSON.parse(jsonContent);
          }
        }
      }
    } catch (openaiError) {
      // Optionally fallback to Anthropic
      try {
        response = await anthropic.messages.create({
          model: ANTHROPIC_MODEL,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4000,
          temperature: 0.3,
        });
        const content = response.content[0];
        if (content.type === 'text') {
          aiResponse = content.text;
          try {
            return JSON.parse(content.text);
          } catch (parseError) {}
        }
      } catch (anthropicError) {}
    }
    return { success: false, error: 'Failed to get valid JSON response from AI' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
} 