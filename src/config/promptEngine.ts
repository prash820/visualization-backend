import * as fs from 'fs';
import * as path from 'path';

export interface PromptConfiguration {
  systemPrompt: string;
  analysisPrompt: string;
  umlPrompt: string;
  infrastructurePrompt: string;
  applicationPrompt: string;
  deploymentPrompt: string;
}

export class PromptEngine {
  private static instance: PromptEngine;
  private promptConfig: PromptConfiguration;

  private constructor() {
    this.promptConfig = this.loadPromptConfiguration();
  }

  public static getInstance(): PromptEngine {
    if (!PromptEngine.instance) {
      PromptEngine.instance = new PromptEngine();
    }
    return PromptEngine.instance;
  }

  private loadPromptConfiguration(): PromptConfiguration {
    const promptPath = path.join(process.cwd(), 'Agent Prompt.txt');
    
    if (!fs.existsSync(promptPath)) {
      throw new Error('Agent Prompt.txt not found. Please ensure the prompt file exists.');
    }

    const fullPrompt = fs.readFileSync(promptPath, 'utf-8');
    
    return {
      systemPrompt: fullPrompt,
      analysisPrompt: this.generateAnalysisPrompt(),
      umlPrompt: this.generateUMLPrompt(),
      infrastructurePrompt: this.generateInfrastructurePrompt(),
      applicationPrompt: this.generateApplicationPrompt(),
      deploymentPrompt: this.generateDeploymentPrompt()
    };
  }

  private generateAnalysisPrompt(): string {
    return `You are an expert product analyst and software architect. Analyze the following app idea comprehensively and provide a detailed summary.

App Idea: {userPrompt}
Target Customers/Users (ICP): {targetCustomers}

Provide a comprehensive analysis in the following JSON format:
{
  "appSummary": {
    "name": "Suggested app name",
    "description": "Clear, detailed description of what the app does",
    "coreValue": "Main value proposition for users",
    "keyFeatures": ["feature1", "feature2", "feature3"],
    "userJourney": "How users will interact with the app step-by-step"
  },
  "targetAudience": {
    "primaryUsers": "Who will use this app primarily",
    "userPersonas": ["persona1", "persona2"],
    "painPoints": ["pain1", "pain2"],
    "useCases": ["usecase1", "usecase2"]
  },
  "technicalOverview": {
    "appType": "web app|mobile app|desktop app|api service",
    "architecture": "monolithic|microservices|serverless",
    "estimatedComplexity": "simple|medium|complex",
    "keyTechnologies": ["tech1", "tech2"],
    "dataRequirements": "What data the app will handle",
    "integrations": ["integration1", "integration2"]
  },
  "businessModel": {
    "revenueModel": "freemium|subscription|one-time|advertising",
    "marketSize": "estimated market opportunity",
    "competitiveAdvantage": "what makes this app unique",
    "mvpFeatures": ["core feature for MVP"]
  },
  "implementationPlan": {
    "estimatedTimeline": "development time estimate",
    "developmentPhases": ["phase1", "phase2"],
    "riskFactors": ["risk1", "risk2"],
    "successMetrics": ["metric1", "metric2"]
  },
  "recommendation": {
    "viability": "high|medium|low",
    "reasoning": "why this app idea is/isn't viable",
    "suggestedImprovements": ["improvement1", "improvement2"],
    "nextSteps": "what to do next"
  }
}

Be thorough, realistic, and provide actionable insights. Focus on creating a clear picture of what will be built.

**CRITICAL JSON RESPONSE REQUIREMENT:**
You MUST respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or code comments outside the JSON structure. The response must be parseable by JSON.parse().

Return ONLY the JSON response, no explanations or additional text.`;
  }

  private generateUMLPrompt(): string {
    return `Based on the app analysis, generate comprehensive UML diagrams for both frontend and backend architecture.

App Analysis: {analysisResult}
Original Prompt: {userPrompt}

Generate the following UML diagrams in Mermaid format:

1. **Architecture Diagram** (graph TD):
   - Show system components, AWS services, and data flow
   - Include frontend, backend, database, and external services
   - Show authentication flow and API endpoints

2. **Sequence Diagram** (sequenceDiagram):
   - Key user interactions and API flows
   - Authentication and authorization flows
   - Data creation, reading, updating, and deletion flows

3. **Component Diagram** (graph TD):
   - Frontend component structure and relationships
   - Show component hierarchy and dependencies
   - Include routing and state management

4. **Database Schema** (erDiagram):
   - Data models and relationships
   - Primary keys, foreign keys, and constraints
   - Show all entities and their attributes

**CRITICAL JSON RESPONSE REQUIREMENT:**
You MUST respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or code comments outside the JSON structure. The response must be parseable by JSON.parse().

Return the diagrams in this exact JSON format:
{
  "architecture": "mermaid diagram code",
  "sequence": "mermaid diagram code", 
  "component": "mermaid diagram code",
  "database": "mermaid diagram code"
}

Return ONLY the JSON response, no explanations or additional text.`;
  }

  private generateInfrastructurePrompt(): string {
    return `Based on the app analysis and UML diagrams, generate AWS infrastructure code using Terraform.

App Analysis: {analysisResult}
UML Diagrams: {umlDiagrams}
Original Prompt: {userPrompt}

Generate comprehensive AWS infrastructure including:

1. **API Gateway**: RESTful API endpoints with proper CORS
2. **Lambda Functions**: Serverless backend logic for all API endpoints
3. **DynamoDB**: NoSQL database tables with proper indexes
4. **S3**: Static file hosting with CloudFront distribution
5. **Cognito**: User authentication and authorization
6. **CloudWatch**: Monitoring and logging
7. **Route 53**: Domain management (if applicable)
8. **IAM**: Proper security roles and policies

Requirements:
- Use Terraform best practices
- Include proper security groups and VPC configuration
- Add CloudWatch alarms and monitoring
- Implement proper backup and disaster recovery
- Include cost optimization strategies
- Add proper tagging for resource management

Return the complete Terraform configuration as a single code block.`;
  }

  private generateApplicationPrompt(): string {
    return `Create a complete web application structure.

App Analysis: {analysisResult}
UML Diagrams: {umlDiagrams}
Infrastructure Code: {infraCode}
Original Prompt: {userPrompt}

Generate a complete application with ALL necessary files:

**FRONTEND REQUIREMENTS:**
- Generate ALL components referenced in imports
- Include types.ts with proper TypeScript interfaces
- Create complete pages with proper routing
- Add API services with proper TypeScript types
- Include all utility functions and constants
- Ensure NO missing imports or undefined components

**BACKEND REQUIREMENTS:**
- Generate complete controllers with proper error handling
- Include database models with validation
- Add business logic services
- Create route definitions with middleware
- Include proper TypeScript types

Generate application code in this JSON format:
{
  "frontend": {
    "components": {
      "ComponentName.tsx": "// Complete React TypeScript component code with ALL imports resolved"
    },
    "pages": {
      "PageName.tsx": "// Complete page component code with proper routing"
    },
    "hooks": {
      "useHookName.ts": "// Complete custom hook code with proper types"
    },
    "services": {
      "serviceName.ts": "// Complete API service code with proper TypeScript types"
    },
    "utils": {
      "types.ts": "// Complete TypeScript type definitions and interfaces",
      "utilityName.ts": "// Complete utility code with proper types"
    }
  },
  "backend": {
    "controllers": {
      "controllerName.ts": "// Complete controller code with proper error handling"
    },
    "models": {
      "modelName.ts": "// Complete model code with validation"
    },
    "services": {
      "serviceName.ts": "// Complete service code with business logic"
    },
    "routes": {
      "routeName.ts": "// Complete route code with middleware"
    },
    "middleware": {
      "middlewareName.ts": "// Complete middleware code with security"
    },
    "utils": {
      "utilityName.ts": "// Complete utility code with proper types"
    }
  }
}

CRITICAL: 
- Generate COMPLETE, FUNCTIONAL code with NO missing imports
- Include proper TypeScript types for ALL functions and components
- Ensure ALL imports are resolved and components are fully implemented
- Create realistic business logic and data flow
- Make sure every component, service, and utility is production-ready

Return ONLY valid JSON. No explanations or additional text.`;
  }

  private generateDeploymentPrompt(): string {
    return `Based on the generated application code and infrastructure, provide deployment instructions and validation steps.

Generated Code: {appCode}
Infrastructure: {infraCode}

Provide deployment guidance including:

1. **Infrastructure Deployment**:
   - Terraform apply steps
   - AWS resource creation order
   - Configuration validation

2. **Application Deployment**:
   - Frontend build and deployment to S3
   - Backend Lambda function deployment
   - Environment variable configuration

3. **Validation Steps**:
   - API endpoint testing
   - Frontend functionality verification
   - Authentication flow testing
   - Performance and security checks

4. **Monitoring Setup**:
   - CloudWatch dashboard configuration
   - Error tracking and alerting
   - Performance monitoring

Return deployment instructions in a structured format.`;
  }

  public getPrompt(type: keyof PromptConfiguration): string {
    return this.promptConfig[type];
  }

  public getSystemPrompt(): string {
    return this.promptConfig.systemPrompt;
  }

  public formatPrompt(prompt: string, variables: Record<string, any>): string {
    let formattedPrompt = prompt;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      formattedPrompt = formattedPrompt.replace(new RegExp(placeholder, 'g'), 
        typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value));
    }
    
    return formattedPrompt;
  }

  public getAnalysisPrompt(userPrompt: string, targetCustomers: string): string {
    return this.formatPrompt(this.promptConfig.analysisPrompt, {
      userPrompt,
      targetCustomers
    });
  }

  public getUMLPrompt(analysisResult: any, userPrompt?: string): string {
    return this.formatPrompt(this.promptConfig.umlPrompt, {
      analysisResult: JSON.stringify(analysisResult, null, 2),
      userPrompt: userPrompt || ''
    });
  }

  public getInfrastructurePrompt(analysisResult: any, umlDiagrams: any, userPrompt: string): string {
    return this.formatPrompt(this.promptConfig.infrastructurePrompt, {
      analysisResult: JSON.stringify(analysisResult, null, 2),
      umlDiagrams: JSON.stringify(umlDiagrams, null, 2),
      userPrompt
    });
  }

  public getApplicationPrompt(analysisResult: any, umlDiagrams: any, infraCode: string, userPrompt?: string): string {
    return this.formatPrompt(this.promptConfig.applicationPrompt, {
      analysisResult: JSON.stringify(analysisResult, null, 2),
      umlDiagrams: JSON.stringify(umlDiagrams, null, 2),
      infraCode,
      userPrompt: userPrompt || ''
    });
  }

  public getDeploymentPrompt(appCode: any, infraCode: string): string {
    return this.formatPrompt(this.promptConfig.deploymentPrompt, {
      appCode: JSON.stringify(appCode, null, 2),
      infraCode
    });
  }
}

export default PromptEngine; 