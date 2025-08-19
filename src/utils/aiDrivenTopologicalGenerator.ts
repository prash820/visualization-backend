import { InfrastructureContext } from '../types/infrastructure';
import OpenAI from 'openai';

// Enhanced interfaces for AI-driven generation
export interface AIGeneratedClass {
  id: string;
  name: string;
  type: 'model' | 'service' | 'controller' | 'repository' | 'interface';
  filePath: string;
  dependencies: string[];
  methods: AIGeneratedMethod[];
  properties: AIGeneratedProperty[];
  infrastructureDependencies: InfrastructureDependency[];
  generationOrder: number;
  content?: string;
}

export interface AIGeneratedMethod {
  name: string;
  parameters: Array<{ name: string; type: string; required: boolean }>;
  returnType: string;
  visibility: 'public' | 'private' | 'protected';
  description?: string;
  implementation?: string;
}

export interface AIGeneratedProperty {
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'protected';
  required: boolean;
  description?: string;
}

export interface InfrastructureDependency {
  type: 'database' | 'api' | 'storage' | 'cache' | 'auth' | 'compute' | 'network';
  resource: string;
  endpoint?: string;
  configuration?: any;
  required: boolean;
}

export interface TopologicalGenerationResult {
  classes: AIGeneratedClass[];
  generationOrder: string[];
  infrastructureIntegration: InfrastructureIntegration[];
  buildFiles: BuildFile[];
  entryPoints: EntryPoint[];
}

export interface InfrastructureIntegration {
  filePath: string;
  integrationType: 'database' | 'api' | 'storage' | 'cache' | 'auth' | 'compute';
  configuration: any;
  environmentVariables: string[];
  dependencies: string[];
  content: string;
}

export interface BuildFile {
  filePath: string;
  content: string;
  type: 'package.json' | 'tsconfig.json' | 'dockerfile' | 'docker-compose.yml' | 'README.md';
}

export interface EntryPoint {
  filePath: string;
  content: string;
  type: 'server.ts' | 'index.ts' | 'app.ts';
}

/**
 * AI-Driven Topological Generator
 * Follows the 4-step approach for comprehensive code generation
 */
export class AIDrivenTopologicalGenerator {
  private openai: OpenAI;
  private infrastructureContext: InfrastructureContext;

  constructor(infrastructureContext: InfrastructureContext) {
    this.infrastructureContext = infrastructureContext;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Step 1: Generate topologically sorted classes with method signatures
   */
  async generateTopologicalClasses(prompt: string, umlDiagrams: any): Promise<AIGeneratedClass[]> {
    console.log('[AIDrivenTopologicalGenerator] Step 1: Generating topologically sorted classes...');

    const systemPrompt = `You are an expert software architect. Analyze the user's prompt and UML diagrams to generate a comprehensive set of TypeScript classes with proper method signatures.

Requirements:
1. Extract all classes, interfaces, and their relationships from UML diagrams
2. Determine proper file paths based on class types (models, services, controllers, repositories)
3. Generate complete method signatures with parameters, return types, and visibility
4. Identify infrastructure dependencies based on the provided infrastructure context
5. Ensure proper topological ordering (models → repositories → services → controllers)

Infrastructure Context: ${JSON.stringify(this.infrastructureContext, null, 2)}

UML Diagrams: ${JSON.stringify(umlDiagrams, null, 2)}

User Prompt: ${prompt}

Generate a JSON array of classes with the following structure:
{
  "id": "class_ClassName",
  "name": "ClassName", 
  "type": "model|service|controller|repository|interface",
  "filePath": "src/path/to/Class.ts",
  "dependencies": ["other_class_names"],
  "methods": [
    {
      "name": "methodName",
      "parameters": [{"name": "param", "type": "string", "required": true}],
      "returnType": "string",
      "visibility": "public|private|protected",
      "description": "Method description"
    }
  ],
  "properties": [
    {
      "name": "propertyName",
      "type": "string",
      "visibility": "public|private|protected",
      "required": true,
      "description": "Property description"
    }
  ],
  "infrastructureDependencies": [
    {
      "type": "database|api|storage|cache|auth|compute|network",
      "resource": "resource_name",
      "endpoint": "endpoint_url",
      "configuration": {},
      "required": true
    }
  ]
}

Return only the JSON array, no additional text.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate the topologically sorted classes with method signatures.' }
        ],
        temperature: 0.3,
        max_tokens: 4000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      // Parse the JSON response
      const classes = JSON.parse(content);
      
      // Assign generation order based on dependencies
      const sortedClasses = this.assignTopologicalOrder(classes);
      
      console.log(`[AIDrivenTopologicalGenerator] Generated ${sortedClasses.length} classes with topological ordering`);
      return sortedClasses;

    } catch (error: any) {
      console.error('[AIDrivenTopologicalGenerator] Error in Step 1:', error);
      throw error;
    }
  }

  /**
   * Step 2: Generate code for each class in topological order
   */
  async generateClassCode(classes: AIGeneratedClass[]): Promise<AIGeneratedClass[]> {
    console.log('[AIDrivenTopologicalGenerator] Step 2: Generating code for each class...');

    const generatedClasses: AIGeneratedClass[] = [];

    for (const classInfo of classes) {
      console.log(`[AIDrivenTopologicalGenerator] Generating code for ${classInfo.name}...`);

      const systemPrompt = `You are an expert TypeScript developer. Generate complete, production-ready TypeScript code for the given class.

Class Information:
${JSON.stringify(classInfo, null, 2)}

Infrastructure Context: ${JSON.stringify(this.infrastructureContext, null, 2)}

Requirements:
1. Generate complete TypeScript class with all methods implemented
2. Include proper imports based on dependencies
3. Integrate with infrastructure resources (database, API, storage, etc.)
4. Use proper TypeScript types and interfaces
5. Include error handling and validation
6. Follow best practices for the class type (model, service, controller, repository)
7. Include JSDoc comments for methods and properties

Generate only the TypeScript code, no additional text or explanations.`;

      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate TypeScript code for ${classInfo.name}` }
          ],
          temperature: 0.2,
          max_tokens: 3000
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          classInfo.content = content;
          generatedClasses.push(classInfo);
        }

      } catch (error: any) {
        console.error(`[AIDrivenTopologicalGenerator] Error generating code for ${classInfo.name}:`, error);
        // Continue with other classes even if one fails
        generatedClasses.push(classInfo);
      }
    }

    console.log(`[AIDrivenTopologicalGenerator] Generated code for ${generatedClasses.length} classes`);
    return generatedClasses;
  }

  /**
   * Step 3: Generate infrastructure integration files
   */
  async generateInfrastructureIntegration(classes: AIGeneratedClass[]): Promise<InfrastructureIntegration[]> {
    console.log('[AIDrivenTopologicalGenerator] Step 3: Generating infrastructure integration...');

    const integrations: InfrastructureIntegration[] = [];

    // Database integration
    if (this.infrastructureContext.databaseUrl) {
      const dbIntegration = await this.generateDatabaseIntegration();
      integrations.push(dbIntegration);
    }

    // API Gateway integration
    if (this.infrastructureContext.apiGatewayUrl) {
      const apiIntegration = await this.generateAPIIntegration();
      integrations.push(apiIntegration);
    }

    // Storage integration
    if (this.infrastructureContext.s3BucketName) {
      const storageIntegration = await this.generateStorageIntegration();
      integrations.push(storageIntegration);
    }

    // Lambda integration
    if (this.infrastructureContext.lambdaFunctions) {
      const lambdaIntegration = await this.generateLambdaIntegration();
      integrations.push(lambdaIntegration);
    }

    console.log(`[AIDrivenTopologicalGenerator] Generated ${integrations.length} infrastructure integrations`);
    return integrations;
  }

  /**
   * Step 4: Generate entry points and build files
   */
  async generateEntryPointsAndBuildFiles(classes: AIGeneratedClass[], integrations: InfrastructureIntegration[]): Promise<{ entryPoints: EntryPoint[], buildFiles: BuildFile[] }> {
    console.log('[AIDrivenTopologicalGenerator] Step 4: Generating entry points and build files...');

    const entryPoints: EntryPoint[] = [];
    const buildFiles: BuildFile[] = [];

    // Generate server.ts
    const serverContent = await this.generateServerFile(classes, integrations);
    entryPoints.push({
      filePath: 'src/server.ts',
      content: serverContent,
      type: 'server.ts'
    });

    // Generate index.ts
    const indexContent = await this.generateIndexFile(classes);
    entryPoints.push({
      filePath: 'src/index.ts',
      content: indexContent,
      type: 'index.ts'
    });

    // Generate package.json
    const packageJson = await this.generatePackageJson(classes, integrations);
    buildFiles.push({
      filePath: 'package.json',
      content: packageJson,
      type: 'package.json'
    });

    // Generate tsconfig.json
    const tsconfigJson = await this.generateTsConfig();
    buildFiles.push({
      filePath: 'tsconfig.json',
      content: tsconfigJson,
      type: 'tsconfig.json'
    });

    // Generate Dockerfile
    const dockerfile = await this.generateDockerfile();
    buildFiles.push({
      filePath: 'Dockerfile',
      content: dockerfile,
      type: 'dockerfile'
    });

    // Generate README.md
    const readme = await this.generateReadme(classes);
    buildFiles.push({
      filePath: 'README.md',
      content: readme,
      type: 'README.md'
    });

    console.log(`[AIDrivenTopologicalGenerator] Generated ${entryPoints.length} entry points and ${buildFiles.length} build files`);
    return { entryPoints, buildFiles };
  }

  /**
   * Main method to execute the 4-step process
   */
  async generateCompleteApplication(prompt: string, umlDiagrams: any): Promise<TopologicalGenerationResult> {
    console.log('[AIDrivenTopologicalGenerator] Starting complete application generation...');

    try {
      // Step 1: Generate topologically sorted classes
      const classes = await this.generateTopologicalClasses(prompt, umlDiagrams);

      // Step 2: Generate code for each class
      const generatedClasses = await this.generateClassCode(classes);

      // Step 3: Generate infrastructure integration
      const integrations = await this.generateInfrastructureIntegration(generatedClasses);

      // Step 4: Generate entry points and build files
      const { entryPoints, buildFiles } = await this.generateEntryPointsAndBuildFiles(generatedClasses, integrations);

      const result: TopologicalGenerationResult = {
        classes: generatedClasses,
        generationOrder: generatedClasses.map(c => c.id),
        infrastructureIntegration: integrations,
        buildFiles,
        entryPoints
      };

      console.log('[AIDrivenTopologicalGenerator] Complete application generation finished');
      return result;

    } catch (error: any) {
      console.error('[AIDrivenTopologicalGenerator] Error in complete generation:', error);
      throw error;
    }
  }

  // Helper methods for infrastructure integration
  private async generateDatabaseIntegration(): Promise<InfrastructureIntegration> {
    const systemPrompt = `Generate a TypeScript database configuration class that integrates with the provided infrastructure context.

Infrastructure Context: ${JSON.stringify(this.infrastructureContext, null, 2)}

Requirements:
1. Create a DatabaseConfig class with singleton pattern
2. Use the database URL from infrastructure context
3. Include connection pooling
4. Add proper error handling
5. Include TypeScript types
6. Add methods for query execution

Generate only the TypeScript code.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate database integration code' }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content || '';

    return {
      filePath: 'src/config/database.ts',
      integrationType: 'database',
      configuration: {
        url: this.infrastructureContext.databaseUrl,
        name: this.infrastructureContext.databaseName,
        type: this.infrastructureContext.databaseType
      },
      environmentVariables: ['DATABASE_URL'],
      dependencies: ['pg'],
      content
    };
  }

  private async generateAPIIntegration(): Promise<InfrastructureIntegration> {
    const systemPrompt = `Generate a TypeScript API configuration class for API Gateway integration.

Infrastructure Context: ${JSON.stringify(this.infrastructureContext, null, 2)}

Requirements:
1. Create an APIConfig class with singleton pattern
2. Use the API Gateway URL from infrastructure context
3. Include methods for making HTTP requests
4. Add proper error handling
5. Include TypeScript types

Generate only the TypeScript code.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate API integration code' }
      ],
      temperature: 0.2,
      max_tokens: 1500
    });

    const content = response.choices[0]?.message?.content || '';

    return {
      filePath: 'src/config/api.ts',
      integrationType: 'api',
      configuration: {
        url: this.infrastructureContext.apiGatewayUrl,
        id: this.infrastructureContext.apiGatewayId,
        stage: this.infrastructureContext.apiGatewayStage
      },
      environmentVariables: ['API_GATEWAY_URL'],
      dependencies: ['axios'],
      content
    };
  }

  private async generateStorageIntegration(): Promise<InfrastructureIntegration> {
    const systemPrompt = `Generate a TypeScript storage configuration class for S3 integration.

Infrastructure Context: ${JSON.stringify(this.infrastructureContext, null, 2)}

Requirements:
1. Create a StorageConfig class with singleton pattern
2. Use the S3 bucket information from infrastructure context
3. Include methods for file upload/download
4. Add proper error handling
5. Include TypeScript types

Generate only the TypeScript code.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate storage integration code' }
      ],
      temperature: 0.2,
      max_tokens: 1500
    });

    const content = response.choices[0]?.message?.content || '';

    return {
      filePath: 'src/config/storage.ts',
      integrationType: 'storage',
      configuration: {
        bucket: this.infrastructureContext.s3BucketName,
        region: this.infrastructureContext.s3BucketRegion
      },
      environmentVariables: ['S3_BUCKET_NAME', 'S3_BUCKET_REGION'],
      dependencies: ['aws-sdk'],
      content
    };
  }

  private async generateLambdaIntegration(): Promise<InfrastructureIntegration> {
    const systemPrompt = `Generate a TypeScript Lambda configuration class for AWS Lambda integration.

Infrastructure Context: ${JSON.stringify(this.infrastructureContext, null, 2)}

Requirements:
1. Create a LambdaConfig class with singleton pattern
2. Use the Lambda function information from infrastructure context
3. Include methods for invoking Lambda functions
4. Add proper error handling
5. Include TypeScript types

Generate only the TypeScript code.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate Lambda integration code' }
      ],
      temperature: 0.2,
      max_tokens: 1500
    });

    const content = response.choices[0]?.message?.content || '';

    return {
      filePath: 'src/config/lambda.ts',
      integrationType: 'compute',
      configuration: this.infrastructureContext.lambdaFunctions,
      environmentVariables: ['AWS_REGION'],
      dependencies: ['aws-sdk'],
      content
    };
  }

  // Helper methods for entry points and build files
  private async generateServerFile(classes: AIGeneratedClass[], integrations: InfrastructureIntegration[]): Promise<string> {
    const systemPrompt = `Generate a complete Express.js server.ts file that integrates all the generated classes and infrastructure.

Classes: ${JSON.stringify(classes, null, 2)}
Infrastructure Integrations: ${JSON.stringify(integrations, null, 2)}

Requirements:
1. Create a complete Express.js server
2. Import and use all generated classes
3. Set up proper routing
4. Include middleware (cors, body-parser, etc.)
5. Add error handling
6. Include TypeScript types
7. Set up proper environment variables

Generate only the TypeScript code.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate server.ts file' }
      ],
      temperature: 0.2,
      max_tokens: 3000
    });

    return response.choices[0]?.message?.content || '';
  }

  private async generateIndexFile(classes: AIGeneratedClass[]): Promise<string> {
    const systemPrompt = `Generate a simple index.ts file that exports all the generated classes.

Classes: ${JSON.stringify(classes, null, 2)}

Requirements:
1. Export all classes
2. Include proper TypeScript types
3. Keep it simple and clean

Generate only the TypeScript code.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate index.ts file' }
      ],
      temperature: 0.2,
      max_tokens: 1000
    });

    return response.choices[0]?.message?.content || '';
  }

  private async generatePackageJson(classes: AIGeneratedClass[], integrations: InfrastructureIntegration[]): Promise<string> {
    const dependencies = new Set(['express', 'cors', 'body-parser']);
    const devDependencies = new Set(['typescript', '@types/node', '@types/express', '@types/cors']);

    // Add dependencies based on infrastructure integrations
    integrations.forEach(integration => {
      integration.dependencies.forEach(dep => dependencies.add(dep));
    });

    const packageJson = {
      name: "generated-app",
      version: "1.0.0",
      description: "AI-generated application",
      main: "dist/index.js",
      scripts: {
        "build": "tsc",
        "start": "node dist/index.js",
        "dev": "ts-node src/index.ts",
        "test": "jest"
      },
      dependencies: Array.from(dependencies).reduce((acc, dep) => {
        acc[dep] = "latest";
        return acc;
      }, {} as Record<string, string>),
      devDependencies: Array.from(devDependencies).reduce((acc, dep) => {
        acc[dep] = "latest";
        return acc;
      }, {} as Record<string, string>)
    };

    return JSON.stringify(packageJson, null, 2);
  }

  private async generateTsConfig(): Promise<string> {
    return JSON.stringify({
      compilerOptions: {
        target: "ES2020",
        module: "commonjs",
        lib: ["ES2020"],
        outDir: "./dist",
        rootDir: "./src",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist"]
    }, null, 2);
  }

  private async generateDockerfile(): Promise<string> {
    return `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]`;
  }

  private async generateReadme(classes: AIGeneratedClass[]): Promise<string> {
    const systemPrompt = `Generate a comprehensive README.md file for the generated application.

Classes: ${JSON.stringify(classes, null, 2)}

Requirements:
1. Include project description
2. List all generated classes and their purposes
3. Include setup instructions
4. Add usage examples
5. Include API documentation if applicable

Generate only the markdown content.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate README.md file' }
      ],
      temperature: 0.2,
      max_tokens: 2000
    });

    return response.choices[0]?.message?.content || '';
  }

  // Helper method to assign topological order
  private assignTopologicalOrder(classes: AIGeneratedClass[]): AIGeneratedClass[] {
    const visited = new Set<string>();
    const tempVisited = new Set<string>();
    const sorted: AIGeneratedClass[] = [];

    const visit = (classInfo: AIGeneratedClass): boolean => {
      if (tempVisited.has(classInfo.id)) {
        return false; // Circular dependency
      }
      if (visited.has(classInfo.id)) {
        return true;
      }

      tempVisited.add(classInfo.id);

      // Visit dependencies first
      for (const depName of classInfo.dependencies) {
        const dep = classes.find(c => c.name === depName);
        if (dep && !visit(dep)) {
          return false;
        }
      }

      tempVisited.delete(classInfo.id);
      visited.add(classInfo.id);
      sorted.push(classInfo);
      return true;
    };

    for (const classInfo of classes) {
      if (!visited.has(classInfo.id)) {
        visit(classInfo);
      }
    }

    // Assign generation order
    sorted.forEach((classInfo, index) => {
      classInfo.generationOrder = index;
    });

    return sorted;
  }
} 