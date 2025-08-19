import { openai, OPENAI_MODEL } from '../config/aiProvider';
import PromptEngine from '../config/promptEngine';
import * as fs from 'fs/promises';
import * as path from 'path';

// Load projects data
const loadProjectsData = async (): Promise<any[]> => {
  try {
    const projectsPath = path.join(process.cwd(), 'projects.json');
    const projectsData = await fs.readFile(projectsPath, 'utf-8');
    return JSON.parse(projectsData);
  } catch (error) {
    console.warn('[AICodeGenerationService] Could not load projects.json:', error);
    return [];
  }
};

const findProjectById = async (projectId: string): Promise<any | null> => {
  const projects = await loadProjectsData();
  return projects.find(project => project._id === projectId) || null;
};

export interface AICodeGenerationResult {
  success: boolean;
  generatedFiles: Array<{ path: string; content: string }>;
  analysisResult?: any;
  umlDiagrams?: any;
  infrastructureCode?: string;
  appCode?: any;
  deploymentUrl?: string;
  errors: string[];
  warnings: string[];
}

export interface AICodeGenerationOptions {
  userPrompt: string;
  targetCustomers?: string;
  projectId: string;
  forceRegenerate?: boolean;
}

export class AICodeGenerationService {
  private promptEngine: PromptEngine;

  constructor() {
    this.promptEngine = PromptEngine.getInstance();
  }

  /**
   * Generate complete application using AI
   */
  async generateCompleteApplication(options: AICodeGenerationOptions): Promise<AICodeGenerationResult> {
    console.log(`[AICodeGenerationService] Starting AI-powered application generation for: ${options.userPrompt}`);
    
    const result: AICodeGenerationResult = {
      success: false,
      generatedFiles: [],
      errors: [],
      warnings: []
    };

    try {
      // Check if project already exists in projects.json
      const existingProject = await findProjectById(options.projectId);
      
      if (existingProject && !options.forceRegenerate) {
        console.log(`[AICodeGenerationService] Found existing project data for ${options.projectId}, using existing data`);
        
        // Use existing data
        result.analysisResult = {
          appSummary: {
            name: existingProject.name,
            description: existingProject.description
          }
        };
        
        // Use existing UML diagrams
        result.umlDiagrams = existingProject.umlDiagrams;
        console.log(`[AICodeGenerationService] Using existing UML diagrams: ${Object.keys(existingProject.umlDiagrams || {}).length} diagrams`);
        
        // Use existing infrastructure code
        result.infrastructureCode = existingProject.infraCode;
        console.log(`[AICodeGenerationService] Using existing infrastructure code: ${existingProject.infraCode?.length || 0} characters`);
        
        // Use existing application code
        result.appCode = existingProject.appCode;
        console.log(`[AICodeGenerationService] Using existing application code with ${Object.keys(existingProject.appCode?.frontend?.components || {}).length} frontend components`);
        
        // Convert existing app code to file structure
        if (existingProject.appCode) {
          result.generatedFiles = this.convertAppCodeToFiles(existingProject.appCode);
        }
        
        result.success = true;
        console.log(`[AICodeGenerationService] ✅ Using existing project data with ${result.generatedFiles.length} files`);
        return result;
      }

      // Generate new data if project doesn't exist or forceRegenerate is true
      console.log(`[AICodeGenerationService] Generating new project data for ${options.projectId}`);

      // Phase 1: App Idea Analysis
      console.log('[AICodeGenerationService] Phase 1: Analyzing app idea...');
      const analysisResult = await this.performAppAnalysis(options.userPrompt, options.targetCustomers || 'General users');
      result.analysisResult = analysisResult;

      // Phase 2: UML Diagram Generation (use existing if available)
      let umlDiagrams;
      if (existingProject && existingProject.umlDiagrams && !options.forceRegenerate) {
        console.log(`[AICodeGenerationService] Using existing UML diagrams: ${Object.keys(existingProject.umlDiagrams).length} diagrams`);
        umlDiagrams = existingProject.umlDiagrams;
      } else {
        console.log('[AICodeGenerationService] Generating new UML diagrams...');
        umlDiagrams = await this.generateUMLDiagrams(analysisResult, options.userPrompt);
      }
      result.umlDiagrams = umlDiagrams;

      // Phase 3: Infrastructure Code Generation (use existing if available)
      let infrastructureCode;
      if (existingProject && existingProject.infraCode && !options.forceRegenerate) {
        console.log(`[AICodeGenerationService] Using existing infrastructure code: ${existingProject.infraCode.length} characters`);
        infrastructureCode = existingProject.infraCode;
      } else {
        console.log('[AICodeGenerationService] Generating new infrastructure code...');
        infrastructureCode = await this.generateInfrastructureCode(analysisResult, umlDiagrams, options.userPrompt);
      }
      result.infrastructureCode = infrastructureCode;

      // Phase 4: Application Code Generation (use existing if available)
      let appCode;
      if (existingProject && existingProject.appCode && !options.forceRegenerate) {
        console.log('[AICodeGenerationService] Using existing application code...');
        appCode = existingProject.appCode;
      } else {
        console.log('[AICodeGenerationService] Generating new application code...');
        appCode = await this.generateApplicationCode(analysisResult, umlDiagrams, infrastructureCode, options.userPrompt);
      }
      
      console.log(`[AICodeGenerationService] Generated new application code: ${Object.keys(appCode.frontend?.components || {}).length} frontend components, ${Object.keys(appCode.backend?.controllers || {}).length} backend controllers`);
      
      // Convert app code to file structure
      result.generatedFiles = this.convertAppCodeToFiles(appCode);
      
      // Save all generated content to project directory
      await this.saveGeneratedContent(options.projectId, {
        analysisResult,
        umlDiagrams,
        infrastructureCode,
        appCode
      });

      result.success = true;
      console.log(`[AICodeGenerationService] ✅ Application generation completed successfully with ${result.generatedFiles.length} files`);

    } catch (error: any) {
      console.error('[AICodeGenerationService] Error during AI generation:', error);
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Phase 1: Perform comprehensive app analysis
   */
  private async performAppAnalysis(userPrompt: string, targetCustomers: string): Promise<any> {
    let response: string = '';
    try {
      const analysisPrompt = this.promptEngine.getAnalysisPrompt(userPrompt, targetCustomers);
      
      response = await this.makeAIRequest(analysisPrompt, this.promptEngine.getSystemPrompt());
      const cleanedResponse = this.cleanJsonResponse(response);
      
      console.log(`[AICodeGenerationService] Raw AI response length: ${response.length}`);
      console.log(`[AICodeGenerationService] Cleaned response length: ${cleanedResponse.length}`);
      
      const analysisResult = JSON.parse(cleanedResponse);
      
      console.log(`[AICodeGenerationService] Analysis completed: ${analysisResult.appSummary?.name || 'Unknown App'}`);
      return analysisResult;
    } catch (error: any) {
      console.error('[AICodeGenerationService] Error parsing analysis result:', error);
      if (response) {
        console.error('[AICodeGenerationService] Raw response:', response);
      }
      throw new Error(`Failed to parse analysis result: ${error.message}`);
    }
  }



  /**
   * Phase 2: Generate UML diagrams
   */
  private async generateUMLDiagrams(analysisResult: any, userPrompt: string): Promise<any> {
    try {
      const umlPrompt = this.promptEngine.getUMLPrompt(analysisResult, userPrompt);
      
      const response = await this.makeAIRequest(umlPrompt, this.promptEngine.getSystemPrompt());
      const cleanedResponse = this.cleanJsonResponse(response);
      
      console.log(`[AICodeGenerationService] UML AI response length: ${response.length}`);
      console.log(`[AICodeGenerationService] UML cleaned response length: ${cleanedResponse.length}`);
      
      const umlDiagrams = JSON.parse(cleanedResponse);
      
      console.log(`[AICodeGenerationService] UML diagrams generated: ${Object.keys(umlDiagrams).length} diagrams`);
      return umlDiagrams;
    } catch (error: any) {
      console.error('[AICodeGenerationService] Error parsing UML diagrams:', error);
      throw new Error(`Failed to parse UML diagrams: ${error.message}`);
    }
  }

  /**
   * Phase 3: Generate infrastructure code
   */
  private async generateInfrastructureCode(analysisResult: any, umlDiagrams: any, userPrompt: string): Promise<string> {
    const infrastructurePrompt = this.promptEngine.getInfrastructurePrompt(analysisResult, umlDiagrams, userPrompt);
    
    const response = await this.makeAIRequest(infrastructurePrompt, this.promptEngine.getSystemPrompt());
    
    console.log(`[AICodeGenerationService] Infrastructure code generated: ${response.length} characters`);
    return response;
  }

  /**
   * Phase 4: Generate application code with context
   */
  private async generateApplicationCode(analysisResult: any, umlDiagrams: any, infrastructureCode: string, userPrompt: string): Promise<any> {
    try {
      console.log('[AICodeGenerationService] Generating application code with UML and infrastructure context...');
      console.log(`[AICodeGenerationService] UML Diagrams available: ${Object.keys(umlDiagrams || {}).length}`);
      console.log(`[AICodeGenerationService] Infrastructure Code length: ${infrastructureCode?.length || 0} characters`);
      
      const applicationPrompt = this.promptEngine.getApplicationPrompt(analysisResult, umlDiagrams, infrastructureCode, userPrompt);
      
      console.log(`[AICodeGenerationService] Application prompt length: ${applicationPrompt.length} characters`);
      
      const response = await this.makeAIRequest(applicationPrompt, this.promptEngine.getSystemPrompt());
      const cleanedResponse = this.cleanJsonResponse(response);
      
      console.log(`[AICodeGenerationService] App code AI response length: ${response.length}`);
      console.log(`[AICodeGenerationService] App code cleaned response length: ${cleanedResponse.length}`);
      
      const appCode = JSON.parse(cleanedResponse);
      
      console.log(`[AICodeGenerationService] Application code generated: ${Object.keys(appCode.frontend?.components || {}).length} frontend components, ${Object.keys(appCode.backend?.controllers || {}).length} backend controllers`);
      
      // Validate that the app code aligns with the UML diagrams
      if (umlDiagrams && appCode) {
        console.log('[AICodeGenerationService] Validating app code against UML context...');
        this.validateAppCodeAgainstUML(appCode, umlDiagrams);
      }
      
      return appCode;
    } catch (error: any) {
      console.error('[AICodeGenerationService] Error generating application code:', error);
      throw new Error(`Failed to generate application code: ${error.message}`);
    }
  }

  /**
   * Validate app code against UML diagrams
   */
  private validateAppCodeAgainstUML(appCode: any, umlDiagrams: any): void {
    try {
      // Check if app code has the expected structure based on UML
      const frontendComponents = Object.keys(appCode.frontend?.components || {});
      const backendControllers = Object.keys(appCode.backend?.controllers || {});
      
      console.log(`[AICodeGenerationService] App code validation:`);
      console.log(`  - Frontend components: ${frontendComponents.length}`);
      console.log(`  - Backend controllers: ${backendControllers.length}`);
      console.log(`  - UML diagrams: ${Object.keys(umlDiagrams).length}`);
      
      // Basic validation - ensure we have essential components
      const essentialFrontendComponents = ['Login.tsx', 'Dashboard.tsx', 'Form.tsx'];
      const essentialBackendControllers = ['authController.ts', 'mainEntityController.ts'];
      
      const missingFrontend = essentialFrontendComponents.filter(comp => 
        !frontendComponents.some(fc => fc.includes(comp.replace('.tsx', '')))
      );
      
      const missingBackend = essentialBackendControllers.filter(ctrl => 
        !backendControllers.some(bc => bc.includes(ctrl.replace('.ts', '')))
      );
      
      if (missingFrontend.length > 0) {
        console.warn(`[AICodeGenerationService] Missing frontend components: ${missingFrontend.join(', ')}`);
      }
      
      if (missingBackend.length > 0) {
        console.warn(`[AICodeGenerationService] Missing backend controllers: ${missingBackend.join(', ')}`);
      }
      
      if (missingFrontend.length === 0 && missingBackend.length === 0) {
        console.log('[AICodeGenerationService] ✅ App code validation passed');
      }
    } catch (error: any) {
      console.warn('[AICodeGenerationService] App code validation failed:', error.message);
    }
  }

  /**
   * Convert app code JSON to file structure
   */
  public convertAppCodeToFiles(appCode: any): Array<{ path: string; content: string }> {
    const files: Array<{ path: string; content: string }> = [];

    // Frontend files
    if (appCode.frontend) {
      // Components
      if (appCode.frontend.components) {
        for (const [fileName, content] of Object.entries(appCode.frontend.components)) {
          files.push({
            path: `frontend/src/components/${fileName}`,
            content: content as string
          });
        }
      }

      // Pages
      if (appCode.frontend.pages) {
        for (const [fileName, content] of Object.entries(appCode.frontend.pages)) {
          files.push({
            path: `frontend/src/pages/${fileName}`,
            content: content as string
          });
        }
      }

      // Hooks
      if (appCode.frontend.hooks) {
        for (const [fileName, content] of Object.entries(appCode.frontend.hooks)) {
          files.push({
            path: `frontend/src/hooks/${fileName}`,
            content: content as string
          });
        }
      }

      // Services
      if (appCode.frontend.services) {
        for (const [fileName, content] of Object.entries(appCode.frontend.services)) {
          files.push({
            path: `frontend/src/services/${fileName}`,
            content: content as string
          });
        }
      }

      // Utils
      if (appCode.frontend.utils) {
        for (const [fileName, content] of Object.entries(appCode.frontend.utils)) {
          files.push({
            path: `frontend/src/utils/${fileName}`,
            content: content as string
          });
        }
      }
    }

    // Backend files
    if (appCode.backend) {
      // Controllers
      if (appCode.backend.controllers) {
        for (const [fileName, content] of Object.entries(appCode.backend.controllers)) {
          files.push({
            path: `backend/src/controllers/${fileName}`,
            content: content as string
          });
        }
      }

      // Models
      if (appCode.backend.models) {
        for (const [fileName, content] of Object.entries(appCode.backend.models)) {
          files.push({
            path: `backend/src/models/${fileName}`,
            content: content as string
          });
        }
      }

      // Services
      if (appCode.backend.services) {
        for (const [fileName, content] of Object.entries(appCode.backend.services)) {
          files.push({
            path: `backend/src/services/${fileName}`,
            content: content as string
          });
        }
      }

      // Routes
      if (appCode.backend.routes) {
        for (const [fileName, content] of Object.entries(appCode.backend.routes)) {
          files.push({
            path: `backend/src/routes/${fileName}`,
            content: content as string
          });
        }
      }

      // Middleware
      if (appCode.backend.middleware) {
        for (const [fileName, content] of Object.entries(appCode.backend.middleware)) {
          files.push({
            path: `backend/src/middleware/${fileName}`,
            content: content as string
          });
        }
      }

      // Utils
      if (appCode.backend.utils) {
        for (const [fileName, content] of Object.entries(appCode.backend.utils)) {
          files.push({
            path: `backend/src/utils/${fileName}`,
            content: content as string
          });
        }
      }
    }

    // Documentation
    if (appCode.documentation) {
      files.push({
        path: 'README.md',
        content: appCode.documentation
      });
    }

    return files;
  }

  /**
   * Save generated content to project directory
   */
  private async saveGeneratedContent(projectId: string, content: {
    analysisResult: any;
    umlDiagrams: any;
    infrastructureCode: string;
    appCode: any;
  }): Promise<void> {
    const projectPath = path.join(process.cwd(), 'generated-projects', projectId);
    
    // Create project directory
    await fs.mkdir(projectPath, { recursive: true });

    // Save analysis result
    await fs.writeFile(
      path.join(projectPath, 'analysis-result.json'),
      JSON.stringify(content.analysisResult, null, 2)
    );

    // Save UML diagrams
    await fs.writeFile(
      path.join(projectPath, 'uml-diagrams.json'),
      JSON.stringify(content.umlDiagrams, null, 2)
    );

    // Save infrastructure code
    await fs.writeFile(
      path.join(projectPath, 'infrastructure.tf'),
      content.infrastructureCode
    );

    // Save application code
    await fs.writeFile(
      path.join(projectPath, 'app-code.json'),
      JSON.stringify(content.appCode, null, 2)
    );

    console.log(`[AICodeGenerationService] Generated content saved to: ${projectPath}`);
  }

  /**
   * Make AI request with retry logic
   */
  private async makeAIRequest(prompt: string, systemPrompt?: string, maxRetries: number = 3): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[AICodeGenerationService] AI request attempt ${attempt}/${maxRetries}`);
        
        const messages: any[] = systemPrompt 
          ? [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }]
          : [{ role: "user", content: prompt }];
          
        const response = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          max_tokens: 8000,
          temperature: 0.3,
          messages
        });
        
        const resultText = response.choices[0]?.message?.content || '';
        
        if (resultText.trim()) {
          return resultText;
        }
        
        throw new Error('Empty response from AI');
        
      } catch (error: any) {
        lastError = error;
        console.warn(`[AICodeGenerationService] AI request attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError || new Error('All AI request attempts failed');
  }

  /**
   * Check if project exists and get its data
   */
  async getExistingProjectData(projectId: string): Promise<any | null> {
    return await findProjectById(projectId);
  }

  /**
   * Clean JSON response from AI
   */
  private cleanJsonResponse(response: string): string {
    let cleaned = response.trim();
    
    console.log(`[AICodeGenerationService] Cleaning response: ${cleaned.substring(0, 200)}...`);
    
    // Remove conversational prefixes
    cleaned = cleaned.replace(/^(I'm sorry|Sorry|I apologize|Let me|Here's|Here is|The|Generated|JSON response|Application code|App code)[:\s]*/i, '');
    
    // Remove markdown code fences and language specifiers
    cleaned = cleaned.replace(/^```[\w]*\s*/g, '');
    cleaned = cleaned.replace(/\s*```$/g, '');
    
    // Remove any lines that are just language specifiers
    cleaned = cleaned.replace(/^(typescript|javascript|ts|js|tsx|jsx|json)\s*$/gm, '');
    
    // Remove extra whitespace and normalize line endings
    cleaned = cleaned.replace(/^\s*\n/gm, '');
    cleaned = cleaned.replace(/\n\s*$/g, '');
    
    // Try to find JSON content if the response contains text before JSON
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
    
    // If still not valid JSON, try to extract from common patterns
    if (!this.isValidJSON(cleaned)) {
      // Look for JSON after common prefixes
      const patterns = [
        /Here is the (application|app) code[:\s]*(\{[\s\S]*\})/i,
        /Generated (application|app) code[:\s]*(\{[\s\S]*\})/i,
        /The (application|app) code is[:\s]*(\{[\s\S]*\})/i,
        /JSON response[:\s]*(\{[\s\S]*\})/i,
        /Application structure[:\s]*(\{[\s\S]*\})/i,
        /App structure[:\s]*(\{[\s\S]*\})/i
      ];
      
      for (const pattern of patterns) {
        const match = cleaned.match(pattern);
        if (match && match[2] && this.isValidJSON(match[2])) {
          cleaned = match[2];
          break;
        }
      }
    }
    
    // Final validation
    if (!this.isValidJSON(cleaned)) {
      console.error(`[AICodeGenerationService] Failed to extract valid JSON from response: ${cleaned.substring(0, 500)}...`);
      throw new Error(`Invalid JSON response: ${cleaned.substring(0, 100)}...`);
    }
    
    console.log(`[AICodeGenerationService] Successfully cleaned JSON response`);
    return cleaned.trim();
  }

  /**
   * Check if string is valid JSON
   */
  private isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }
}

export default AICodeGenerationService; 