import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface AppTypeConfig {
  type: 'react' | 'vue' | 'angular' | 'nextjs' | 'nuxt' | 'svelte' | 'vanilla' | 'unknown';
  framework: string;
  version: string;
  buildConfig: {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    scripts: Record<string, string>;
    buildCommand: string;
    startCommand: string;
    port: number;
  };
  fileStructure: {
    frontend: string[];
    backend: string[];
    shared: string[];
    build: string[];
  };
}

export class ProjectStructureService {
  private static readonly PROJECTS_DIR = path.join(process.cwd(), 'generated-projects');
  private static readonly APP_TYPE_CONFIGS: Record<string, AppTypeConfig> = {
    react: {
      type: 'react',
      framework: 'React',
      version: '18.2.0',
      buildConfig: {
        dependencies: {
          'react': '^18.2.0',
          'react-dom': '^18.2.0',
          'react-router-dom': '^6.8.0'
        },
        devDependencies: {
          '@types/react': '^18.0.28',
          '@types/react-dom': '^18.0.11',
          '@vitejs/plugin-react': '^3.1.0',
          'vite': '^4.1.0',
          'typescript': '^4.9.5'
        },
        scripts: {
          'dev': 'vite',
          'build': 'tsc && vite build',
          'preview': 'vite preview',
          'lint': 'eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0'
        },
        buildCommand: 'npm run build',
        startCommand: 'npm run dev',
        port: 3000
      },
      fileStructure: {
        frontend: ['src/components', 'src/pages', 'src/utils', 'src/styles', 'src/assets', 'src/config'],
        backend: ['src/controllers', 'src/models', 'src/routes', 'src/utils', 'src/middleware', 'src/config'],
        shared: ['src/types', 'src/interfaces', 'src/constants'],
        build: ['package.json', 'tsconfig.json', 'vite.config.ts', 'index.html']
      }
    },
    nextjs: {
      type: 'nextjs',
      framework: 'Next.js',
      version: '14.0.0',
      buildConfig: {
        dependencies: {
          'next': '^14.0.0',
          'react': '^18.2.0',
          'react-dom': '^18.2.0',
          '@types/node': '^20.0.0',
          '@types/react': '^18.0.28',
          '@types/react-dom': '^18.0.11',
          'typescript': '^5.0.0',
          'tailwindcss': '^3.3.0',
          'autoprefixer': '^10.4.0',
          'postcss': '^8.4.0'
        },
        devDependencies: {
          'eslint': '^8.38.0',
          'eslint-config-next': '^14.0.0'
        },
        scripts: {
          'dev': 'next dev',
          'build': 'next build',
          'start': 'next start',
          'lint': 'next lint'
        },
        buildCommand: 'npm run build',
        startCommand: 'npm run dev',
        port: 3000
      },
      fileStructure: {
        frontend: ['app', 'components', 'lib', 'styles', 'public'],
        backend: ['api', 'lib', 'utils', 'middleware'],
        shared: ['types', 'interfaces', 'constants'],
        build: ['package.json', 'tsconfig.json', 'next.config.js', 'tailwind.config.js', 'postcss.config.js']
      }
    },
    vue: {
      type: 'vue',
      framework: 'Vue.js',
      version: '3.3.0',
      buildConfig: {
        dependencies: {
          'vue': '^3.3.0',
          'vue-router': '^4.2.0',
          'pinia': '^2.1.0'
        },
        devDependencies: {
          '@vitejs/plugin-vue': '^4.1.0',
          'vite': '^4.1.0',
          'typescript': '^4.9.5',
          'vue-tsc': '^1.2.0'
        },
        scripts: {
          'dev': 'vite',
          'build': 'vue-tsc && vite build',
          'preview': 'vite preview'
        },
        buildCommand: 'npm run build',
        startCommand: 'npm run dev',
        port: 3000
      },
      fileStructure: {
        frontend: ['src/components', 'src/views', 'src/utils', 'src/styles', 'src/assets', 'src/stores'],
        backend: ['src/controllers', 'src/models', 'src/routes', 'src/utils', 'src/middleware'],
        shared: ['src/types', 'src/interfaces', 'src/constants'],
        build: ['package.json', 'tsconfig.json', 'vite.config.ts', 'index.html']
      }
    }
  };

  // Backend configuration for Node.js/Express
  private static readonly BACKEND_CONFIG = {
    dependencies: {
      'express': '^4.18.0',
      'cors': '^2.8.5',
      'helmet': '^7.0.0',
      'morgan': '^1.10.0',
      'dotenv': '^16.0.0',
      'bcryptjs': '^2.4.3',
      'jsonwebtoken': '^9.0.0',
      'mongoose': '^7.0.0',
      'pg': '^8.10.0',
      'sequelize': '^6.30.0',
      'redis': '^4.6.0',
      'multer': '^1.4.5'
    },
    devDependencies: {
      '@types/express': '^4.17.17',
      '@types/cors': '^2.8.13',
      '@types/morgan': '^1.9.4',
      '@types/bcryptjs': '^2.4.2',
      '@types/jsonwebtoken': '^9.0.1',
      '@types/node': '^20.0.0',
      '@types/multer': '^1.4.7',
      'typescript': '^5.0.0',
      'ts-node': '^10.9.0',
      'nodemon': '^3.0.0',
      'jest': '^29.5.0',
      '@types/jest': '^29.5.0'
    },
    scripts: {
      'dev': 'nodemon src/server.ts',
      'build': 'tsc',
      'start': 'node dist/server.js',
      'test': 'jest',
      'lint': 'eslint src --ext .ts'
    },
    buildCommand: 'npm run build',
    startCommand: 'npm run dev',
    port: 3001
  };

  /**
   * Detect app type based on prompt and generated code
   */
  static detectAppType(prompt: string, generatedCode: any): AppTypeConfig {
    const promptLower = prompt.toLowerCase();
    const codeString = JSON.stringify(generatedCode).toLowerCase();
    
    // Check for specific frameworks in prompt
    if (promptLower.includes('next.js') || promptLower.includes('nextjs') || 
        codeString.includes('next') || codeString.includes('app/')) {
      return this.APP_TYPE_CONFIGS.nextjs;
    }
    
    if (promptLower.includes('vue') || codeString.includes('vue') || 
        codeString.includes('vue-router') || codeString.includes('pinia')) {
      return this.APP_TYPE_CONFIGS.vue;
    }
    
    if (promptLower.includes('angular') || codeString.includes('angular') || 
        codeString.includes('@angular')) {
      return this.APP_TYPE_CONFIGS.angular;
    }
    
    // Default to React for most cases
    return this.APP_TYPE_CONFIGS.react;
  }

  /**
   * Create organized file structure from flat code object
   */
  static organizeCodeStructure(generatedCode: any, appType: AppTypeConfig): any {
    const organized = {
      appType: appType.type,
      framework: appType.framework,
      version: appType.version,
      fileStructure: {
        frontend: {
          components: {} as Record<string, string>,
          pages: {} as Record<string, string>,
          utils: {} as Record<string, string>,
          styles: {} as Record<string, string>,
          assets: {} as Record<string, string>,
          config: {} as Record<string, string>
        },
        backend: {
          controllers: {} as Record<string, string>,
          models: {} as Record<string, string>,
          routes: {} as Record<string, string>,
          utils: {} as Record<string, string>,
          middleware: {} as Record<string, string>,
          config: {} as Record<string, string>
        },
        shared: {
          types: {} as Record<string, string>,
          interfaces: {} as Record<string, string>,
          constants: {} as Record<string, string>
        },
        build: {
          frontendPackageJson: '',
          backendPackageJson: '',
          tsconfig: '',
          webpackConfig: '',
          viteConfig: '',
          nextConfig: '',
          dockerfile: '',
          dockerCompose: ''
        }
      },
      // Legacy structure for backward compatibility
      frontend: generatedCode.frontend || {},
      backend: generatedCode.backend || {},
      documentation: generatedCode.documentation || '',
      buildConfig: {
        frontend: appType.buildConfig,
        backend: this.BACKEND_CONFIG,
        dependencies: { ...appType.buildConfig.dependencies, ...this.BACKEND_CONFIG.dependencies },
        devDependencies: { ...appType.buildConfig.devDependencies, ...this.BACKEND_CONFIG.devDependencies },
        scripts: { ...appType.buildConfig.scripts, ...this.BACKEND_CONFIG.scripts },
        buildCommand: 'npm run build',
        startCommand: 'npm run dev',
        port: appType.buildConfig.port
      },
      validation: {
        buildErrors: [],
        runtimeErrors: [],
        missingDependencies: [],
        addedDependencies: [],
        lintErrors: [],
        typeErrors: [],
        lastValidated: new Date()
      }
    };

    // Categorize files from the flat structure
    if (generatedCode.frontend) {
      Object.entries(generatedCode.frontend).forEach(([category, files]: [string, any]) => {
        if (typeof files === 'object') {
          Object.entries(files).forEach(([filename, content]: [string, any]) => {
            const categorized = this.categorizeFile(filename, content as string, 'frontend');
            if (categorized) {
              (organized.fileStructure.frontend as any)[categorized.category][categorized.name] = content as string;
            }
          });
        }
      });
    }

    if (generatedCode.backend) {
      Object.entries(generatedCode.backend).forEach(([category, files]: [string, any]) => {
        if (typeof files === 'object') {
          Object.entries(files).forEach(([filename, content]: [string, any]) => {
            const categorized = this.categorizeFile(filename, content as string, 'backend');
            if (categorized) {
              (organized.fileStructure.backend as any)[categorized.category][categorized.name] = content as string;
            }
          });
        }
      });
    }

    // Generate build configuration files
    organized.fileStructure.build.frontendPackageJson = this.generateFrontendPackageJson(appType, organized);
    organized.fileStructure.build.backendPackageJson = this.generateBackendPackageJson(organized);
    organized.fileStructure.build.tsconfig = this.generateTsConfig(appType);
    
    if (appType.type === 'nextjs') {
      organized.fileStructure.build.nextConfig = this.generateNextConfig();
    } else {
      organized.fileStructure.build.viteConfig = this.generateViteConfig(appType);
    }
    
    organized.fileStructure.build.dockerfile = this.generateDockerfile(appType);
    organized.fileStructure.build.dockerCompose = this.generateDockerCompose(appType);

    return organized;
  }

  /**
   * Categorize files based on filename and content
   */
  private static categorizeFile(filename: string, content: string, type: 'frontend' | 'backend'): { category: string; name: string } | null {
    const name = filename.replace(/\.(tsx?|jsx?|css|scss|json)$/, '');
    
    if (type === 'frontend') {
      if (filename.includes('component') || filename.includes('Component') || filename.endsWith('.tsx')) {
        return { category: 'components', name };
      }
      if (filename.includes('page') || filename.includes('Page') || filename.includes('view')) {
        return { category: 'pages', name };
      }
      if (filename.includes('util') || filename.includes('helper') || filename.includes('service')) {
        return { category: 'utils', name };
      }
      if (filename.endsWith('.css') || filename.endsWith('.scss') || filename.includes('style')) {
        return { category: 'styles', name };
      }
      if (filename.includes('config') || filename.includes('Config')) {
        return { category: 'config', name };
      }
      return { category: 'components', name }; // Default
    } else {
      if (filename.includes('controller') || filename.includes('Controller')) {
        return { category: 'controllers', name };
      }
      if (filename.includes('model') || filename.includes('Model')) {
        return { category: 'models', name };
      }
      if (filename.includes('route') || filename.includes('Route')) {
        return { category: 'routes', name };
      }
      if (filename.includes('util') || filename.includes('helper') || filename.includes('service')) {
        return { category: 'utils', name };
      }
      if (filename.includes('middleware') || filename.includes('Middleware')) {
        return { category: 'middleware', name };
      }
      if (filename.includes('config') || filename.includes('Config')) {
        return { category: 'config', name };
      }
      return { category: 'controllers', name }; // Default
    }
  }

  /**
   * Generate frontend package.json based on app type and dependencies
   */
  private static generateFrontendPackageJson(appType: AppTypeConfig, organizedCode: any): string {
    const dependencies = { ...appType.buildConfig.dependencies };
    const devDependencies = { ...appType.buildConfig.devDependencies };

    // Add detected dependencies from code
    const codeString = JSON.stringify(organizedCode);
    
    // Detect additional dependencies
    if (codeString.includes('axios')) dependencies['axios'] = '^1.3.0';
    if (codeString.includes('lodash')) dependencies['lodash'] = '^4.17.21';
    if (codeString.includes('moment')) dependencies['moment'] = '^2.29.4';
    if (codeString.includes('uuid')) dependencies['uuid'] = '^9.0.0';
    if (codeString.includes('@types/uuid')) devDependencies['@types/uuid'] = '^9.0.1';
    if (codeString.includes('tailwind')) {
      devDependencies['tailwindcss'] = '^3.2.7';
      devDependencies['autoprefixer'] = '^10.4.14';
      devDependencies['postcss'] = '^8.4.21';
    }

    return JSON.stringify({
      name: "generated-app-frontend",
      version: "1.0.0",
      description: "AI-generated frontend application",
      private: true,
      scripts: appType.buildConfig.scripts,
      dependencies,
      devDependencies,
      browserslist: {
        production: [">0.2%", "not dead", "not op_mini all"],
        development: ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
      }
    }, null, 2);
  }

  /**
   * Generate backend package.json
   */
  private static generateBackendPackageJson(organizedCode: any): string {
    const dependencies = { ...this.BACKEND_CONFIG.dependencies };
    const devDependencies = { ...this.BACKEND_CONFIG.devDependencies };

    // Add detected dependencies from code
    const codeString = JSON.stringify(organizedCode);
    
    // Detect additional backend dependencies
    if (codeString.includes('mongoose')) dependencies['mongoose'] = '^7.0.0';
    if (codeString.includes('pg')) dependencies['pg'] = '^8.10.0';
    if (codeString.includes('sequelize')) dependencies['sequelize'] = '^6.30.0';
    if (codeString.includes('redis')) dependencies['redis'] = '^4.6.0';
    if (codeString.includes('multer')) dependencies['multer'] = '^1.4.5';
    if (codeString.includes('@types/multer')) devDependencies['@types/multer'] = '^1.4.7';

    return JSON.stringify({
      name: "generated-app-backend",
      version: "1.0.0",
      description: "AI-generated backend API",
      main: "dist/server.js",
      scripts: this.BACKEND_CONFIG.scripts,
      dependencies,
      devDependencies,
      engines: {
        "node": ">=18.0.0"
      }
    }, null, 2);
  }

  /**
   * Generate Next.js configuration
   */
  private static generateNextConfig(): string {
    return `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;`;
  }

  /**
   * Generate TypeScript configuration
   */
  private static generateTsConfig(appType: AppTypeConfig): string {
    const baseConfig: any = {
      compilerOptions: {
        target: "ES2020",
        useDefineForClassFields: true,
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        allowJs: false,
        skipLibCheck: true,
        esModuleInterop: false,
        allowSyntheticDefaultImports: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        module: "ESNext",
        moduleResolution: "Node",
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx"
      },
      include: ["src"],
      references: [{ path: "./tsconfig.node.json" }]
    };

    if (appType.type === 'nextjs') {
      baseConfig.compilerOptions.jsx = "preserve";
      baseConfig.include = ["next-env.d.ts", "**/*.ts", "**/*.tsx"];
      baseConfig.references = undefined;
    }

    return JSON.stringify(baseConfig, null, 2);
  }

  /**
   * Generate Vite configuration
   */
  private static generateViteConfig(appType: AppTypeConfig): string {
    if (appType.type === 'nextjs') return '';

    const config: any = {
      plugins: [],
      resolve: {
        alias: {
          "@": "/src"
        }
      }
    };

    if (appType.type === 'react') {
      config.plugins.push('react()');
    } else if (appType.type === 'vue') {
      config.plugins.push('vue()');
    }

    return `import { defineConfig } from 'vite'\nimport ${appType.type} from '@vitejs/plugin-${appType.type}'\n\nexport default defineConfig({\n  plugins: [${appType.type}()],\n  resolve: {\n    alias: {\n      '@': '/src'\n    }\n  }\n})`;
  }

  /**
   * Generate Dockerfile
   */
  private static generateDockerfile(appType: AppTypeConfig): string {
    return `# Multi-stage build for ${appType.framework} application
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;
  }

  /**
   * Generate Docker Compose
   */
  private static generateDockerCompose(appType: AppTypeConfig): string {
    return `version: '3.8'
services:
  app:
    build: .
    ports:
      - "${appType.buildConfig.port}:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped`;
  }

  /**
   * Create actual file system structure
   */
  static async createFileSystemStructure(projectId: string, organizedCode: any): Promise<string> {
    const projectPath = path.join(this.PROJECTS_DIR, projectId);
    
    try {
      // Create project directory
      await fs.mkdir(projectPath, { recursive: true });
      
      // Create frontend structure
      for (const category of Object.keys(organizedCode.fileStructure.frontend)) {
        const categoryPath = path.join(projectPath, 'frontend', category);
        await fs.mkdir(categoryPath, { recursive: true });
        
        // Write files in this category
        for (const [filename, content] of Object.entries(organizedCode.fileStructure.frontend[category])) {
          const filePath = path.join(categoryPath, `${filename}.tsx`);
          await fs.writeFile(filePath, content as string);
        }
      }
      
      // Create backend structure
      for (const category of Object.keys(organizedCode.fileStructure.backend)) {
        const categoryPath = path.join(projectPath, 'backend', category);
        await fs.mkdir(categoryPath, { recursive: true });
        
        // Write files in this category
        for (const [filename, content] of Object.entries(organizedCode.fileStructure.backend[category])) {
          const filePath = path.join(categoryPath, `${filename}.ts`);
          await fs.writeFile(filePath, content as string);
        }
      }
      
      // Create shared structure
      for (const category of Object.keys(organizedCode.fileStructure.shared)) {
        const categoryPath = path.join(projectPath, 'shared', category);
        await fs.mkdir(categoryPath, { recursive: true });
        
        // Write files in this category
        for (const [filename, content] of Object.entries(organizedCode.fileStructure.shared[category])) {
          const filePath = path.join(categoryPath, `${filename}.ts`);
          await fs.writeFile(filePath, content as string);
        }
      }
      
      // Write build files
      const buildPath = path.join(projectPath, 'build');
      await fs.mkdir(buildPath, { recursive: true });
      
      for (const [filename, content] of Object.entries(organizedCode.fileStructure.build)) {
        if (content) {
          const filePath = path.join(buildPath, filename);
          await fs.writeFile(filePath, content as string);
        }
      }
      
      // Write package.json to root
      if (organizedCode.fileStructure.build.frontendPackageJson) {
        await fs.writeFile(
          path.join(projectPath, 'package.json'), 
          organizedCode.fileStructure.build.frontendPackageJson
        );
      }
      if (organizedCode.fileStructure.build.backendPackageJson) {
        await fs.writeFile(
          path.join(projectPath, 'backend/package.json'), 
          organizedCode.fileStructure.build.backendPackageJson
        );
      }
      
      return projectPath;
    } catch (error) {
      console.error('Error creating file system structure:', error);
      throw error;
    }
  }

  /**
   * Get project structure info
   */
  static getProjectStructureInfo(projectPath: string): any {
    return {
      root: projectPath,
      frontend: path.join(projectPath, 'frontend'),
      backend: path.join(projectPath, 'backend'),
      shared: path.join(projectPath, 'shared'),
      build: path.join(projectPath, 'build')
    };
  }

  /**
   * Simple method to read generated files from filesystem
   */
  static async readGeneratedFiles(projectId: string): Promise<any> {
    const projectPath = path.join(this.PROJECTS_DIR, projectId);
    
    if (!fsSync.existsSync(projectPath)) {
      throw new Error(`No generated files found for project ${projectId}`);
    }

    const shouldSkipDirectory = (dirName: string): boolean => {
      const skipDirs = ['node_modules', '.next', 'dist', 'build', '.git', '.vscode'];
      return skipDirs.includes(dirName);
    };

    const readSourceFiles = (dirPath: string, basePath: string = ''): Record<string, string> => {
      const files: Record<string, string> = {};
      
      if (!fsSync.existsSync(dirPath)) {
        return files;
      }

      const items = fsSync.readdirSync(dirPath, { withFileTypes: true });
      for (const item of items) {
        if (shouldSkipDirectory(item.name)) {
          continue; // Skip build directories
        }

        const itemPath = path.join(dirPath, item.name);
        const relativePath = basePath ? `${basePath}/${item.name}` : item.name;
        
        if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx') || 
                              item.name.endsWith('.js') || item.name.endsWith('.jsx') ||
                              item.name.endsWith('.json') || item.name.endsWith('.css') ||
                              item.name.endsWith('.md'))) {
          try {
            files[relativePath] = fsSync.readFileSync(itemPath, 'utf-8');
          } catch (error) {
            console.warn(`Could not read file ${itemPath}:`, error);
          }
        } else if (item.isDirectory()) {
          const subFiles = readSourceFiles(itemPath, relativePath);
          Object.assign(files, subFiles);
        }
      }
      
      return files;
    };

    const sourceFiles = readSourceFiles(projectPath);
    
    return {
      projectId,
      files: sourceFiles,
      fileCount: Object.keys(sourceFiles).length,
      generatedAt: new Date().toISOString()
    };
  }
} 