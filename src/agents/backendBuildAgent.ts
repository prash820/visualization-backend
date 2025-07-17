import { openai, OPENAI_MODEL } from '../config/aiProvider';

/**
 * Generate backend build/config files using AI, given all backend source files.
 * @param backendFiles Array of { path, content } for all backend source files
 * @param jobId Optional job ID for logging
 * @returns Array of { path, content } for build/config files (e.g. package.json, tsconfig.json, etc.)
 */
export async function generateBackendBuildFilesWithAI(
  backendFiles: { path: string; content: string }[],
  jobId?: string
): Promise<{ path: string; content: string }[]> {
  // Compose a prompt for the AI
  const prompt = `You are an expert Node.js/TypeScript backend engineer specializing in AWS Lambda deployment. Given the following backend source files, generate ALL necessary build and configuration files required to build, deploy, and run this backend as an AWS Lambda function using npm/yarn. 

IMPORTANT: Output ONLY the raw file content, NO markdown formatting, NO backticks, NO code blocks.

**CRITICAL REQUIREMENTS:**
- You MUST create a package.json with Lambda-specific dependencies and scripts
- The main entry point should be "src/index.ts" with a Lambda handler export
- Include both "build" and "deploy" scripts for Lambda deployment
- Use serverless-http for Express.js Lambda integration
- Include aws-lambda types for Lambda handler functions
- Include all necessary dependencies found in the source files
- Only output build/config files (e.g. package.json, tsconfig.json, serverless.yml, .env.example, README.md, .gitignore, etc.), NOT the source files themselves.

**LAMBDA-SPECIFIC REQUIREMENTS:**
- "build": "tsc" (TypeScript compilation for Lambda)
- "deploy": "serverless deploy" (if using Serverless Framework)
- "dev": "ts-node src/index.ts" (local development)
- Include serverless-http dependency for Express.js Lambda integration
- Include aws-lambda types for Lambda handler functions
- Include serverless framework dependencies if using serverless.yml
- Configure TypeScript for Lambda execution environment

**PACKAGE.JSON REQUIREMENTS:**
- "build": "tsc" (TypeScript compilation)
- "dev": "ts-node src/index.ts" (local development)
- "deploy": "serverless deploy" (Lambda deployment)
- Include serverless-http, aws-lambda, and all dependencies found in imports
- Include dev dependencies (typescript, ts-node, @types/node, @types/express, @types/aws-lambda, etc.)

**For each file, output exactly this format:**
  ---filename---
  <raw file content without any formatting>
  ---end---

**Only include files that are required for the Lambda backend to be installed, built, and deployed.**
**Infer dependencies, scripts, and config from the provided code.**
**Do NOT wrap any content in markdown code blocks or backticks.**

Here are the backend source files:
` + backendFiles.map(f => `---${f.path}---\n${f.content}\n---end---`).join('\n');

  // Call OpenAI
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: 'You are a senior backend engineer and DevOps expert. Always output raw file content without markdown formatting.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
    max_tokens: 4096
  });

  const aiText = response.choices[0].message.content || '';

  // Parse the AI response into files
  const buildFiles: { path: string; content: string }[] = [];
  const fileRegex = /---([\w\-.\/]+)---\n([\s\S]*?)\n---end---/g;
  let match;
  while ((match = fileRegex.exec(aiText)) !== null) {
    let content = match[2];
    
    // Remove markdown code blocks if present
    content = content.replace(/^```[\w]*\n/, ''); // Remove opening ```json or ```typescript
    content = content.replace(/\n```$/, ''); // Remove closing ```
    
    buildFiles.push({ path: match[1], content: content.trim() });
  }

  // Ensure package.json exists with proper Lambda scripts
  const hasPackageJson = buildFiles.some(f => f.path === 'package.json');
  if (!hasPackageJson) {
    console.log('[BackendBuildAgent] No package.json found in AI response, creating fallback Lambda package.json');
    buildFiles.push({
      path: 'package.json',
      content: generateFallbackPackageJson(backendFiles)
    });
  } else {
    // Check if package.json has proper Lambda scripts
    const packageJson = buildFiles.find(f => f.path === 'package.json');
    if (packageJson) {
      try {
        const pkg = JSON.parse(packageJson.content);
        const hasBuildScript = pkg.scripts && pkg.scripts.build;
        const hasServerlessHttp = pkg.dependencies && pkg.dependencies['serverless-http'];
        if (!hasBuildScript || !hasServerlessHttp) {
          console.log('[BackendBuildAgent] Package.json missing Lambda scripts or dependencies, updating...');
          packageJson.content = generateFallbackPackageJson(backendFiles);
        }
      } catch (e) {
        console.log('[BackendBuildAgent] Invalid package.json, replacing with Lambda fallback...');
        packageJson.content = generateFallbackPackageJson(backendFiles);
      }
    }
  }

  return buildFiles;
}

/**
 * Generate a fallback package.json with proper Lambda scripts and dependencies
 */
function generateFallbackPackageJson(backendFiles: { path: string; content: string }[]): string {
  // Extract dependencies from source files
  const dependencies = new Set<string>([
    'express',
    'cors',
    'helmet',
    'morgan',
    'serverless-http' // Lambda-specific dependency
  ]);
  const devDependencies = new Set<string>([
    'typescript',
    'ts-node',
    '@types/node',
    '@types/express',
    '@types/cors',
    '@types/helmet',
    '@types/morgan',
    '@types/aws-lambda' // Lambda-specific types
  ]);

  // Parse imports from source files
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  for (const file of backendFiles) {
    let match;
    while ((match = importRegex.exec(file.content)) !== null) {
      const importPath = match[1];
      if (!importPath.startsWith('.') && !importPath.startsWith('@')) {
        dependencies.add(importPath);
      }
    }
  }

  // Check if index.ts exists (Lambda entry point)
  const hasIndex = backendFiles.some(f => f.path === 'src/index.ts');
  const entryPoint = hasIndex ? 'src/index.ts' : 'src/index.ts';

  return JSON.stringify({
    name: 'lambda-backend-api',
    version: '1.0.0',
    description: 'Lambda Backend API generated from UML diagrams',
    main: entryPoint.replace('.ts', '.js'),
    scripts: {
      build: 'tsc',
      dev: `ts-node ${entryPoint}`,
      deploy: 'serverless deploy',
      test: 'echo "No tests specified" && exit 0'
    },
    dependencies: Array.from(dependencies).reduce((acc, dep) => ({ ...acc, [dep]: '^4.0.0' }), {}),
    devDependencies: Array.from(devDependencies).reduce((acc, dep) => ({ ...acc, [dep]: '^4.0.0' }), {}),
    engines: {
      node: '>=16.0.0'
    }
  }, null, 2);
} 