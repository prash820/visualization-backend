import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface AppCodeStructure {
  frontend?: {
    components?: Record<string, string>;
    pages?: Record<string, string>;
    hooks?: Record<string, string>;
    services?: Record<string, string>;
    utils?: Record<string, string>;
  };
  backend?: {
    controllers?: Record<string, string>;
    models?: Record<string, string>;
    services?: Record<string, string>;
    routes?: Record<string, string>;
    middleware?: Record<string, string>;
    utils?: Record<string, string>;
  };
}

export interface ConversionResult {
  success: boolean;
  projectPath: string;
  frontendPath?: string;
  backendPath?: string;
  errors: string[];
  warnings: string[];
  generatedFiles: string[];
}

export class AppCodeConverter {
  private baseDir: string;

  constructor(baseDir: string = 'generated-projects') {
    this.baseDir = baseDir;
  }

  /**
   * Convert app-code.json to actual folder structure
   */
  async convertAppCodeToFolderStructure(
    projectId: string,
    appCode: AppCodeStructure,
    options: {
      validateCode?: boolean;
      installDependencies?: boolean;
      createPackageJson?: boolean;
    } = {}
  ): Promise<ConversionResult> {
    const result: ConversionResult = {
      success: false,
      projectPath: '',
      errors: [],
      warnings: [],
      generatedFiles: []
    };

    try {
      console.log(`[AppCodeConverter] Starting conversion for project: ${projectId}`);

      // Create project directory
      const projectPath = path.join(this.baseDir, projectId);
      await this.ensureDirectoryExists(projectPath);
      result.projectPath = projectPath;

      // Convert frontend
      if (appCode.frontend) {
        const frontendPath = path.join(projectPath, 'frontend');
        await this.convertFrontend(appCode.frontend, frontendPath, result);
        result.frontendPath = frontendPath;
      }

      // Convert backend
      if (appCode.backend) {
        const backendPath = path.join(projectPath, 'backend');
        await this.convertBackend(appCode.backend, backendPath, result);
        result.backendPath = backendPath;
      }

      // Create shared directory
      const sharedPath = path.join(projectPath, 'shared');
      await this.ensureDirectoryExists(sharedPath);
      await this.createSharedFiles(sharedPath, result);

      // Create root package.json for monorepo
      await this.createRootPackageJson(projectPath, result);

      // Create task-plan.json
      await this.createTaskPlan(projectPath, projectId, result);

      // Create README.md for monorepo
      await this.createReadme(projectPath, result);

      // Validate code if requested
      if (options.validateCode) {
        await this.validateGeneratedCode(projectPath, result);
      }

      // Install dependencies if requested
      if (options.installDependencies) {
        await this.installDependencies(projectPath, result);
      }

      result.success = true;
      console.log(`[AppCodeConverter] ✅ Conversion completed successfully`);
      console.log(`[AppCodeConverter] Generated ${result.generatedFiles.length} files`);

    } catch (error: any) {
      console.error('[AppCodeConverter] Error during conversion:', error);
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Convert frontend code structure
   */
  private async convertFrontend(
    frontend: AppCodeStructure['frontend'],
    frontendPath: string,
    result: ConversionResult
  ): Promise<void> {
    console.log(`[AppCodeConverter] Converting frontend to: ${frontendPath}`);

    // Create frontend directory structure
    await this.ensureDirectoryExists(frontendPath);
    await this.ensureDirectoryExists(path.join(frontendPath, 'src'));
    await this.ensureDirectoryExists(path.join(frontendPath, 'src', 'components'));
    await this.ensureDirectoryExists(path.join(frontendPath, 'src', 'pages'));
    await this.ensureDirectoryExists(path.join(frontendPath, 'src', 'hooks'));
    await this.ensureDirectoryExists(path.join(frontendPath, 'src', 'services'));
    await this.ensureDirectoryExists(path.join(frontendPath, 'src', 'utils'));
    await this.ensureDirectoryExists(path.join(frontendPath, 'public'));

    // Convert components
    if (frontend?.components) {
      for (const [fileName, content] of Object.entries(frontend.components)) {
        const filePath = path.join(frontendPath, 'src', 'components', fileName);
        await this.writeFile(filePath, content, result);
      }
    }

    // Convert pages
    if (frontend?.pages) {
      for (const [fileName, content] of Object.entries(frontend.pages)) {
        const filePath = path.join(frontendPath, 'src', 'pages', fileName);
        await this.writeFile(filePath, content, result);
      }
    }

    // Convert hooks
    if (frontend?.hooks) {
      for (const [fileName, content] of Object.entries(frontend.hooks)) {
        const filePath = path.join(frontendPath, 'src', 'hooks', fileName);
        await this.writeFile(filePath, content, result);
      }
    }

    // Convert services
    if (frontend?.services) {
      for (const [fileName, content] of Object.entries(frontend.services)) {
        const filePath = path.join(frontendPath, 'src', 'services', fileName);
        await this.writeFile(filePath, content, result);
      }
    }

    // Convert utils
    if (frontend?.utils) {
      for (const [fileName, content] of Object.entries(frontend.utils)) {
        const filePath = path.join(frontendPath, 'src', 'utils', fileName);
        await this.writeFile(filePath, content, result);
      }
    }

    // Create package.json for frontend
    await this.createFrontendPackageJson(frontendPath, result);

    // Create index.html
    await this.createFrontendIndexHtml(frontendPath, result);

    // Create App.tsx
    await this.createFrontendAppTsx(frontendPath, result);

    // Create index.tsx
    await this.createFrontendIndexTsx(frontendPath, result);

    // Create basic CSS
    await this.createFrontendCss(frontendPath, result);

    // Create tsconfig.json for TypeScript compilation
    await this.createFrontendTsConfig(frontendPath, result);

    // Generate missing components that are referenced in existing components
    await this.generateMissingComponents(frontendPath, result);
  }

  /**
   * Convert backend code structure
   */
  private async convertBackend(
    backend: AppCodeStructure['backend'],
    backendPath: string,
    result: ConversionResult
  ): Promise<void> {
    console.log(`[AppCodeConverter] Converting backend to: ${backendPath}`);

    // Create backend directory structure
    await this.ensureDirectoryExists(backendPath);
    await this.ensureDirectoryExists(path.join(backendPath, 'src'));
    await this.ensureDirectoryExists(path.join(backendPath, 'src', 'controllers'));
    await this.ensureDirectoryExists(path.join(backendPath, 'src', 'models'));
    await this.ensureDirectoryExists(path.join(backendPath, 'src', 'services'));
    await this.ensureDirectoryExists(path.join(backendPath, 'src', 'routes'));
    await this.ensureDirectoryExists(path.join(backendPath, 'src', 'middleware'));
    await this.ensureDirectoryExists(path.join(backendPath, 'src', 'utils'));

    // Convert controllers
    if (backend?.controllers) {
      for (const [fileName, content] of Object.entries(backend.controllers)) {
        const filePath = path.join(backendPath, 'src', 'controllers', fileName);
        await this.writeFile(filePath, content, result);
      }
    }

    // Convert models
    if (backend?.models) {
      for (const [fileName, content] of Object.entries(backend.models)) {
        const filePath = path.join(backendPath, 'src', 'models', fileName);
        await this.writeFile(filePath, content, result);
      }
    }

    // Convert services
    if (backend?.services) {
      for (const [fileName, content] of Object.entries(backend.services)) {
        const filePath = path.join(backendPath, 'src', 'services', fileName);
        await this.writeFile(filePath, content, result);
      }
    }

    // Convert routes
    if (backend?.routes) {
      for (const [fileName, content] of Object.entries(backend.routes)) {
        const filePath = path.join(backendPath, 'src', 'routes', fileName);
        await this.writeFile(filePath, content, result);
      }
    }

    // Convert middleware
    if (backend?.middleware) {
      for (const [fileName, content] of Object.entries(backend.middleware)) {
        const filePath = path.join(backendPath, 'src', 'middleware', fileName);
        await this.writeFile(filePath, content, result);
      }
    }

    // Convert utils
    if (backend?.utils) {
      for (const [fileName, content] of Object.entries(backend.utils)) {
        const filePath = path.join(backendPath, 'src', 'utils', fileName);
        await this.writeFile(filePath, content, result);
      }
    }

    // Create package.json for backend
    await this.createBackendPackageJson(backendPath, result);

    // Create server.ts
    await this.createBackendServerTs(backendPath, result);

    // Create tsconfig.json
    await this.createBackendTsConfig(backendPath, result);
  }

  /**
   * Create shared files
   */
  private async createSharedFiles(sharedPath: string, result: ConversionResult): Promise<void> {
    // Create shared package.json
    const sharedPackageJson = {
      name: "shared",
      version: "1.0.0",
      private: true,
      main: "index.ts",
      scripts: {
        "build": "tsc",
        "clean": "rm -rf dist"
      },
      devDependencies: {
        "typescript": "^4.9.5"
      }
    };

    await this.writeFile(path.join(sharedPath, 'package.json'), JSON.stringify(sharedPackageJson, null, 2), result);

    // Create types.ts
    const typesContent = `// Shared types between frontend and backend
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
`;

    await this.writeFile(path.join(sharedPath, 'types.ts'), typesContent, result);

    // Create index.ts for shared exports
    const indexContent = `// Shared exports
export * from './types';`;

    await this.writeFile(path.join(sharedPath, 'index.ts'), indexContent, result);
  }

  /**
   * Create task-plan.json
   */
  private async createTaskPlan(projectPath: string, projectId: string, result: ConversionResult): Promise<void> {
    const taskPlan = {
      projectId,
      createdAt: new Date().toISOString(),
      status: 'converted',
      structure: {
        frontend: true,
        backend: true,
        shared: true
      },
      files: result.generatedFiles,
      errors: result.errors,
      warnings: result.warnings
    };

    await this.writeFile(path.join(projectPath, 'task-plan.json'), JSON.stringify(taskPlan, null, 2), result);
  }

  /**
   * Create README.md for monorepo
   */
  private async createReadme(projectPath: string, result: ConversionResult): Promise<void> {
    const readme = `# Generated Application - Monorepo Structure

This is a full-stack application generated with a monorepo structure using npm workspaces.

## Project Structure

\`\`\`
project-root/
├── package.json          # Root package.json with workspaces
├── frontend/            # React frontend application
│   ├── package.json     # Frontend dependencies
│   ├── src/            # Frontend source code
│   └── public/         # Static assets
├── backend/            # Node.js backend application
│   ├── package.json    # Backend dependencies
│   └── src/           # Backend source code
└── shared/            # Shared code and types
    ├── package.json   # Shared dependencies
    └── index.ts      # Shared exports
\`\`\`

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm (v7 or higher for workspaces support)

### Installation

Install all dependencies for the entire monorepo:

\`\`\`bash
npm install
\`\`\`

This will install dependencies for all workspaces (frontend, backend, shared) in a single command.

### Development

Start both frontend and backend in development mode:

\`\`\`bash
npm run dev
\`\`\`

Or start them individually:

\`\`\`bash
# Start frontend only
npm run dev:frontend

# Start backend only
npm run dev:backend
\`\`\`

### Building

Build all applications:

\`\`\`bash
npm run build
\`\`\`

Or build individually:

\`\`\`bash
# Build frontend only
npm run build:frontend

# Build backend only
npm run build:backend
\`\`\`

### Testing

Run tests for all workspaces:

\`\`\`bash
npm run test
\`\`\`

### Linting

Run linting for all workspaces:

\`\`\`bash
npm run lint
\`\`\`

### Cleaning

Clean build artifacts for all workspaces:

\`\`\`bash
npm run clean
\`\`\`

## Workspace Scripts

### Root Scripts
- \`npm run dev\` - Start both frontend and backend
- \`npm run build\` - Build all workspaces
- \`npm run test\` - Test all workspaces
- \`npm run lint\` - Lint all workspaces
- \`npm run clean\` - Clean all workspaces

### Frontend Scripts
- \`npm run start\` - Start development server
- \`npm run build\` - Build for production
- \`npm run test\` - Run tests
- \`npm run eject\` - Eject from Create React App

### Backend Scripts
- \`npm run dev\` - Start development server with nodemon
- \`npm run build\` - Compile TypeScript
- \`npm run start\` - Start production server
- \`npm run test\` - Run tests

## Benefits of Monorepo Structure

1. **Single Installation**: Run \`npm install\` once to install all dependencies
2. **Shared Dependencies**: Common dependencies are hoisted to the root
3. **Unified Scripts**: Run commands across all workspaces
4. **Code Sharing**: Easy to share types and utilities between frontend and backend
5. **Consistent Tooling**: Same linting, testing, and build tools across all workspaces

## Development Workflow

1. Install dependencies: \`npm install\`
2. Start development: \`npm run dev\`
3. Make changes in frontend/src or backend/src
4. Build for production: \`npm run build\`
5. Deploy as needed

## Generated Files

This application was automatically generated with:
- Frontend components and pages
- Backend controllers and services
- Shared types and utilities
- Complete monorepo configuration
- AI-generated missing components

For more details, see the \`task-plan.json\` and \`documentation.json\` files.
`;

    await this.writeFile(path.join(projectPath, 'README.md'), readme, result);
  }

  /**
   * Create root package.json for monorepo
   */
  private async createRootPackageJson(projectPath: string, result: ConversionResult): Promise<void> {
    const packageJson = {
      name: "app-monorepo",
      version: "1.0.0",
      private: true,
      workspaces: [
        "frontend",
        "backend",
        "shared"
      ],
      scripts: {
        "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
        "dev:frontend": "npm run start --workspace=frontend",
        "dev:backend": "npm run dev --workspace=backend",
        "build": "npm run build --workspaces",
        "build:frontend": "npm run build --workspace=frontend",
        "build:backend": "npm run build --workspace=backend",
        "install:all": "npm install",
        "test": "npm run test --workspaces",
        "lint": "npm run lint --workspaces",
        "clean": "npm run clean --workspaces"
      },
      devDependencies: {
        "concurrently": "^7.6.0",
        "typescript": "^4.9.5"
      },
      dependencies: {
        "dotenv": "^16.0.3"
      }
    };

    await this.writeFile(path.join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2), result);
  }

  /**
   * Create frontend package.json for monorepo
   */
  private async createFrontendPackageJson(frontendPath: string, result: ConversionResult): Promise<void> {
    const packageJson = {
      name: "frontend",
      version: "1.0.0",
      private: true,
      dependencies: {
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "react-router-dom": "^6.8.0",
        "axios": "^1.3.0"
      },
      devDependencies: {
        "@types/react": "^18.0.28",
        "@types/react-dom": "^18.0.11",
        "typescript": "^4.9.5",
        "tailwindcss": "^3.2.7",
        "autoprefixer": "^10.4.14",
        "postcss": "^8.4.21",
        "react-scripts": "5.0.1"
      },
      scripts: {
        "start": "react-scripts start",
        "build": "react-scripts build",
        "test": "react-scripts test",
        "eject": "react-scripts eject",
        "lint": "eslint src --ext .ts,.tsx",
        "lint:fix": "eslint src --ext .ts,.tsx --fix",
        "clean": "rm -rf build"
      },
      eslintConfig: {
        extends: [
          "react-app",
          "react-app/jest"
        ]
      },
      browserslist: {
        production: [
          ">0.2%",
          "not dead",
          "not op_mini all"
        ],
        development: [
          "last 1 chrome version",
          "last 1 firefox version",
          "last 1 safari version"
        ]
      }
    };

    await this.writeFile(path.join(frontendPath, 'package.json'), JSON.stringify(packageJson, null, 2), result);
  }

  /**
   * Create frontend index.html
   */
  private async createFrontendIndexHtml(frontendPath: string, result: ConversionResult): Promise<void> {
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Generated application" />
    <title>Generated App</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`;

    await this.writeFile(path.join(frontendPath, 'public', 'index.html'), indexHtml, result);
  }

  /**
   * Create frontend App.tsx
   */
  private async createFrontendAppTsx(frontendPath: string, result: ConversionResult): Promise<void> {
    const appTsx = `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<div>Welcome to the app!</div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;`;

    await this.writeFile(path.join(frontendPath, 'src', 'App.tsx'), appTsx, result);
  }

  /**
   * Create frontend index.tsx
   */
  private async createFrontendIndexTsx(frontendPath: string, result: ConversionResult): Promise<void> {
    const indexTsx = `import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;

    await this.writeFile(path.join(frontendPath, 'src', 'index.tsx'), indexTsx, result);
  }

  /**
   * Create frontend CSS
   */
  private async createFrontendCss(frontendPath: string, result: ConversionResult): Promise<void> {
    const css = `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}

.App {
  text-align: center;
  padding: 20px;
}

.dashboard {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.login {
  max-width: 400px;
  margin: 50px auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.login form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.login input {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
}

.login button {
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

.login button:hover {
  background-color: #0056b3;
}

.calculator {
  max-width: 300px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.display {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 15px;
  text-align: right;
  font-size: 24px;
  font-family: monospace;
  min-height: 40px;
}

.keypad {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.key {
  padding: 15px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background-color: #fff;
  cursor: pointer;
  font-size: 18px;
  transition: background-color 0.2s;
}

.key:hover {
  background-color: #e9ecef;
}

.key.operator {
  background-color: #007bff;
  color: white;
}

.key.operator:hover {
  background-color: #0056b3;
}

.key.equals {
  background-color: #28a745;
  color: white;
}

.key.equals:hover {
  background-color: #1e7e34;
}

.key.clear {
  background-color: #dc3545;
  color: white;
}

.key.clear:hover {
  background-color: #c82333;
}`;

    await this.writeFile(path.join(frontendPath, 'src', 'index.css'), css, result);
  }

  /**
   * Create frontend tsconfig.json
   */
  private async createFrontendTsConfig(frontendPath: string, result: ConversionResult): Promise<void> {
    const tsConfig = {
      compilerOptions: {
        target: "es5",
        lib: [
          "dom",
          "dom.iterable",
          "es6"
        ],
        allowJs: true,
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        noFallthroughCasesInSwitch: true,
        module: "esnext",
        moduleResolution: "node",
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx"
      },
      include: [
        "src"
      ]
    };

    await this.writeFile(path.join(frontendPath, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2), result);
  }

    /**
   * Generate missing components based on import analysis
   */
  private async generateMissingComponents(frontendPath: string, result: ConversionResult): Promise<void> {
    console.log(`[AppCodeConverter] Checking for missing components in: ${frontendPath}`);

    try {
      const componentsPath = path.join(frontendPath, 'src', 'components');
      
      // Read all existing component files
      const existingFiles = await this.getExistingFiles(componentsPath);
      const existingComponentNames = existingFiles.map(file => file.replace('.tsx', '').replace('.ts', ''));
      
      // Analyze imports in existing components to find missing dependencies
      const missingComponents = await this.findMissingComponents(componentsPath, existingFiles);
      
      if (missingComponents.length === 0) {
        console.log(`[AppCodeConverter] No missing components detected`);
        return;
      }

      console.log(`[AppCodeConverter] Found missing components: ${missingComponents.join(', ')}`);

      // Generate missing components using AI
      for (const componentName of missingComponents) {
        await this.generateComponentWithAI(componentName, frontendPath, result);
      }

    } catch (error: any) {
      console.error(`[AppCodeConverter] Error checking for missing components:`, error.message);
      result.warnings.push(`Could not check for missing components: ${error.message}`);
    }
  }

  /**
   * Get list of existing files in a directory
   */
  private async getExistingFiles(dirPath: string): Promise<string[]> {
    try {
      const files = await fs.readdir(dirPath);
      return files.filter(file => file.endsWith('.tsx') || file.endsWith('.ts'));
    } catch (error) {
      return [];
    }
  }

  /**
   * Find missing components by analyzing imports in existing files
   */
  private async findMissingComponents(componentsPath: string, existingFiles: string[]): Promise<string[]> {
    const missingComponents: string[] = [];
    const existingComponentNames = existingFiles.map(file => file.replace('.tsx', '').replace('.ts', ''));

    for (const file of existingFiles) {
      try {
        const filePath = path.join(componentsPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Find import statements that reference local components
        const importRegex = /import\s+(\w+)\s+from\s+['"]\.\/(\w+)['"]/g;
        let match;
        
        while ((match = importRegex.exec(content)) !== null) {
          const importedComponent = match[2];
          if (!existingComponentNames.includes(importedComponent)) {
            missingComponents.push(importedComponent);
          }
        }
      } catch (error) {
        console.error(`[AppCodeConverter] Error reading file ${file}:`, error);
      }
    }

    return [...new Set(missingComponents)]; // Remove duplicates
  }



  /**
   * Generate a component using AI based on the context
   */
  private async generateComponentWithAI(componentName: string, frontendPath: string, result: ConversionResult): Promise<void> {
    console.log(`[AppCodeConverter] Generating missing component with AI: ${componentName}.tsx`);

    try {
      // Read existing components to understand the context
      const componentsPath = path.join(frontendPath, 'src', 'components');
      const existingComponents = await this.readExistingComponents(componentsPath);
      
      // Create AI prompt for component generation
      const prompt = this.createComponentGenerationPrompt(componentName, existingComponents);
      
      // Use AI to generate the component
      const aiService = new (await import('./aiCodeGenerationService')).AICodeGenerationService();
      const response = await aiService['makeAIRequest'](prompt);
      
      // Clean and parse the response
      const cleanedResponse = aiService['cleanJsonResponse'](response);
      const componentData = JSON.parse(cleanedResponse);
      
      // Extract the component code
      const componentCode = componentData.componentCode || componentData.code || response;
      
      // Write the component file
      const componentPath = path.join(componentsPath, `${componentName}.tsx`);
      await this.writeFile(componentPath, componentCode, result);
      
      console.log(`[AppCodeConverter] Successfully generated component: ${componentName}.tsx`);
      
    } catch (error: any) {
      console.error(`[AppCodeConverter] Error generating component ${componentName}:`, error.message);
      result.errors.push(`Failed to generate component ${componentName}: ${error.message}`);
    }
  }

  /**
   * Read existing components to understand the context
   */
  private async readExistingComponents(componentsPath: string): Promise<Record<string, string>> {
    const components: Record<string, string> = {};
    
    try {
      const files = await fs.readdir(componentsPath);
      const tsxFiles = files.filter(file => file.endsWith('.tsx'));
      
      for (const file of tsxFiles) {
        const filePath = path.join(componentsPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const componentName = file.replace('.tsx', '');
        components[componentName] = content;
      }
    } catch (error) {
      console.error(`[AppCodeConverter] Error reading existing components:`, error);
    }
    
    return components;
  }

  /**
   * Create AI prompt for component generation
   */
  private createComponentGenerationPrompt(componentName: string, existingComponents: Record<string, string>): string {
    const existingComponentsStr = Object.entries(existingComponents)
      .map(([name, code]) => `// ${name}.tsx\n${code}`)
      .join('\n\n');

    return `Generate a comprehensive React TypeScript component named "${componentName}" that is fully compatible with the existing components in this project.

Existing components:
${existingComponentsStr}

CRITICAL REQUIREMENTS:
1. Generate a COMPLETE, FUNCTIONAL component with NO missing imports or dependencies
2. Use proper TypeScript interfaces and types for ALL props and state
3. Follow the EXACT same coding style and patterns as existing components
4. The component should be practical, functional, and production-ready
5. Include proper exports (named export: export const ${componentName})
6. Add comprehensive error handling and loading states
7. Include realistic business logic and data flow
8. Ensure ALL imports are resolved and components are fully implemented
9. Add proper validation and user feedback
10. Include responsive design and accessibility features

COMPONENT REQUIREMENTS:
- Use functional components with React hooks (useState, useEffect, etc.)
- Include proper TypeScript interfaces for all props
- Add comprehensive error handling and loading states
- Include realistic data and business logic
- Add proper form validation where applicable
- Include responsive design and accessibility
- Follow the same naming conventions and patterns as existing components
- Ensure the component integrates seamlessly with the existing codebase

Generate ONLY the component code in this JSON format:
{
  "componentCode": "// Complete React TypeScript component code with ALL imports resolved and full functionality"
}

CRITICAL: 
- Generate COMPLETE, FUNCTIONAL code with NO TODO comments or placeholder implementations
- Ensure ALL imports are resolved and the component is fully implemented
- Include comprehensive error handling and validation
- Create realistic business logic and data flow
- Make sure the component is production-ready
- Include proper TypeScript types for ALL functions and props

Return ONLY valid JSON. No explanations, no markdown, no additional text. Just the JSON.`;
  }

  /**
   * Create backend package.json for monorepo
   */
  private async createBackendPackageJson(backendPath: string, result: ConversionResult): Promise<void> {
    const packageJson = {
      name: "backend",
      version: "1.0.0",
      main: "dist/index.js",
      scripts: {
        "start": "node dist/index.js",
        "dev": "nodemon src/index.ts",
        "build": "tsc",
        "test": "jest",
        "lint": "eslint src --ext .ts",
        "lint:fix": "eslint src --ext .ts --fix",
        "clean": "rm -rf dist"
      },
      dependencies: {
        "express": "^4.18.2",
        "cors": "^2.8.5",
        "helmet": "^6.0.1",
        "aws-sdk": "^2.1.0",
        "aws-jwt-verify": "^3.0.0",
        "bcryptjs": "^2.4.3",
        "jsonwebtoken": "^9.0.0",
        "express-validator": "^6.14.3"
      },
      devDependencies: {
        "@types/express": "^4.17.17",
        "@types/cors": "^2.8.13",
        "@types/bcryptjs": "^2.4.2",
        "@types/jsonwebtoken": "^9.0.1",
        "@types/node": "^18.15.0",
        "typescript": "^4.9.5",
        "nodemon": "^2.0.20",
        "ts-node": "^10.9.1",
        "jest": "^29.4.3",
        "@types/jest": "^29.4.0",
        "eslint": "^8.34.0",
        "@typescript-eslint/eslint-plugin": "^5.50.0",
        "@typescript-eslint/parser": "^5.50.0"
      }
    };

    await this.writeFile(path.join(backendPath, 'package.json'), JSON.stringify(packageJson, null, 2), result);
  }

  /**
   * Create backend server.ts
   */
  private async createBackendServerTs(backendPath: string, result: ConversionResult): Promise<void> {
    const serverTs = `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`;

    await this.writeFile(path.join(backendPath, 'src', 'index.ts'), serverTs, result);
  }

  /**
   * Create backend tsconfig.json
   */
  private async createBackendTsConfig(backendPath: string, result: ConversionResult): Promise<void> {
    const tsConfig = {
      compilerOptions: {
        target: "es2020",
        module: "commonjs",
        lib: ["es2020"],
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
    };

    await this.writeFile(path.join(backendPath, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2), result);
  }

  /**
   * Validate generated code
   */
  private async validateGeneratedCode(projectPath: string, result: ConversionResult): Promise<void> {
    console.log('[AppCodeConverter] Validating generated code...');

    try {
      // Check for TypeScript errors
      const frontendPath = path.join(projectPath, 'frontend');
      const backendPath = path.join(projectPath, 'backend');

      if (await this.pathExists(frontendPath)) {
        try {
          await execAsync('npm run lint', { cwd: frontendPath });
          console.log('[AppCodeConverter] ✅ Frontend code validation passed');
        } catch (error: any) {
          result.warnings.push(`Frontend linting issues: ${error.message}`);
        }
      }

      if (await this.pathExists(backendPath)) {
        try {
          await execAsync('npm run lint', { cwd: backendPath });
          console.log('[AppCodeConverter] ✅ Backend code validation passed');
        } catch (error: any) {
          result.warnings.push(`Backend linting issues: ${error.message}`);
        }
      }

      // Comprehensive validation
      await this.validateCompleteness(projectPath, result);
    } catch (error: any) {
      result.warnings.push(`Code validation error: ${error.message}`);
    }
  }

  /**
   * Comprehensive validation to ensure application completeness
   */
  private async validateCompleteness(projectPath: string, result: ConversionResult): Promise<void> {
    console.log('[AppCodeConverter] Performing comprehensive validation');

    const frontendPath = path.join(projectPath, 'frontend');
    const backendPath = path.join(projectPath, 'backend');

    // Check for essential features
    const essentialFeatures = [
      'authentication',
      'dashboard',
      'crud-operations',
      'error-handling',
      'validation',
      'loading-states'
    ];

    for (const feature of essentialFeatures) {
      if (!await this.checkFeatureExists(projectPath, feature)) {
        result.warnings.push(`Missing essential feature: ${feature}`);
      }
    }

    // Check for proper TypeScript configuration
    const tsConfigPath = path.join(frontendPath, 'tsconfig.json');
    if (await this.pathExists(tsConfigPath)) {
      try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);

        const { stderr } = await execAsync(`npx tsc --noEmit`, {
          cwd: frontendPath,
          timeout: 30000
        });

        if (stderr && stderr.trim()) {
          result.warnings.push(`TypeScript compilation warnings: ${stderr}`);
        }
      } catch (error: any) {
        result.errors.push(`TypeScript compilation failed: ${error.message}`);
      }
    }
  }

  /**
   * Check if essential features exist in the generated code
   */
  private async checkFeatureExists(projectPath: string, feature: string): Promise<boolean> {
    const frontendPath = path.join(projectPath, 'frontend', 'src');
    const backendPath = path.join(projectPath, 'backend', 'src');

    try {
      const frontendFiles = await this.getAllFiles(frontendPath);
      const backendFiles = await this.getAllFiles(backendPath);
      const allFiles = [...frontendFiles, ...backendFiles];

      const fileContents = await Promise.all(
        allFiles.map(async (file) => {
          try {
            return await fs.readFile(file, 'utf-8');
          } catch {
            return '';
          }
        })
      );

      const combinedContent = fileContents.join('\n').toLowerCase();

      switch (feature) {
        case 'authentication':
          return combinedContent.includes('login') || combinedContent.includes('auth') || combinedContent.includes('user');
        case 'dashboard':
          return combinedContent.includes('dashboard') || combinedContent.includes('overview');
        case 'crud-operations':
          return combinedContent.includes('create') || combinedContent.includes('update') || combinedContent.includes('delete');
        case 'error-handling':
          return combinedContent.includes('error') || combinedContent.includes('catch') || combinedContent.includes('try');
        case 'validation':
          return combinedContent.includes('validate') || combinedContent.includes('validation') || combinedContent.includes('required');
        case 'loading-states':
          return combinedContent.includes('loading') || combinedContent.includes('spinner') || combinedContent.includes('skeleton');
        default:
          return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all files in a directory recursively
   */
  private async getAllFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...await this.getAllFiles(fullPath));
        } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js'))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return files;
  }

  /**
   * Install dependencies
   */
  private async installDependencies(projectPath: string, result: ConversionResult): Promise<void> {
    console.log('[AppCodeConverter] Installing dependencies...');

    try {
      const frontendPath = path.join(projectPath, 'frontend');
      const backendPath = path.join(projectPath, 'backend');

      if (await this.pathExists(frontendPath)) {
        console.log('[AppCodeConverter] Installing frontend dependencies...');
        await execAsync('npm install', { cwd: frontendPath });
      }

      if (await this.pathExists(backendPath)) {
        console.log('[AppCodeConverter] Installing backend dependencies...');
        await execAsync('npm install', { cwd: backendPath });
      }

      console.log('[AppCodeConverter] ✅ Dependencies installed successfully');
    } catch (error: any) {
      result.warnings.push(`Dependency installation error: ${error.message}`);
    }
  }

  /**
   * Helper methods
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private async writeFile(filePath: string, content: string, result: ConversionResult): Promise<void> {
    try {
      await fs.writeFile(filePath, content, 'utf-8');
      result.generatedFiles.push(filePath);
    } catch (error: any) {
      result.errors.push(`Failed to write file ${filePath}: ${error.message}`);
    }
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
} 