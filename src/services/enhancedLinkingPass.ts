import { Project, SourceFile, SyntaxKind, Node } from 'ts-morph';
import { SymbolTable, SymbolRecord } from './symbolTable';
import { SmartImportResolver, ImportFix } from './smartImportResolver';
import { TemplateEngine } from './templateEngine';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

export interface EnhancedLinkingResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  fixedFiles: string[];
  importFixes: ImportFix[];
  symbolTableStats: {
    totalSymbols: number;
    byKind: Record<string, number>;
    byFile: Record<string, number>;
  };
  summary: {
    filesGenerated: number;
    filesFixed: number;
    importsAdded: number;
    importsRemoved: number;
    symbolsRegistered: number;
  };
}

export class EnhancedLinkingPass {
  private project: Project;
  private symbolTable: SymbolTable;
  private smartImportResolver: SmartImportResolver;
  private templateEngine: TemplateEngine;

  constructor(projectPath: string, symbolTable: SymbolTable) {
    this.project = new Project({
      useInMemoryFileSystem: false
    });
    this.symbolTable = symbolTable;
    this.smartImportResolver = new SmartImportResolver(projectPath, symbolTable);
    this.templateEngine = new TemplateEngine();
  }

  /**
   * Enhanced two-pass generation with smart import resolution
   */
  async runEnhancedGeneration(
    irData: any,
    projectPath: string,
    aiService: any
  ): Promise<EnhancedLinkingResult> {
    console.log('[EnhancedLinkingPass] 🚀 Starting enhanced generation with smart import resolution');
    
    const result: EnhancedLinkingResult = {
      success: true,
      errors: [],
      warnings: [],
      fixedFiles: [],
      importFixes: [],
      symbolTableStats: { totalSymbols: 0, byKind: {}, byFile: {} },
      summary: { filesGenerated: 0, filesFixed: 0, importsAdded: 0, importsRemoved: 0, symbolsRegistered: 0 }
    };

    try {
      // Pass A: Generate files with enhanced awareness
      console.log('[EnhancedLinkingPass] 📝 Pass A: Generate files with cross-file awareness');
      const generationResult = await this.generateFilesWithAwareness(irData, projectPath, aiService);
      
      result.errors.push(...generationResult.errors);
      result.summary.filesGenerated = generationResult.generatedFiles.length;
      
      if (generationResult.errors.length > 0) {
        console.warn('[EnhancedLinkingPass] ⚠️ Pass A had errors:', generationResult.errors);
      }
      
      // Register all generated files for cross-file awareness
      console.log('[EnhancedLinkingPass] 🔍 Registering files for cross-file analysis');
      await this.smartImportResolver.registerGeneratedFiles(generationResult.generatedFiles);
      
      // Pass B: Smart import resolution
      console.log('[EnhancedLinkingPass] 🔗 Pass B: Smart import resolution');
      const importResult = await this.smartImportResolver.fixAllImports(generationResult.generatedFiles);
      
      result.importFixes = importResult.fixes;
      result.summary.filesFixed = importResult.summary.filesFixed;
      result.summary.importsAdded = importResult.summary.importsAdded;
      result.summary.importsRemoved = importResult.summary.importsRemoved;
      result.fixedFiles = generationResult.generatedFiles;
      
      // Validate and get symbol table stats
      const validation = this.symbolTable.validate();
      result.errors.push(...validation.errors);
      result.warnings.push(...validation.warnings);
      
      const stats = this.symbolTable.getStats();
      result.symbolTableStats = {
        totalSymbols: stats.total,
        byKind: stats.byKind,
        byFile: stats.byFile
      };
      result.summary.symbolsRegistered = stats.total;
      
      // Check for circular dependencies
      if (this.symbolTable.hasCircularDependencies()) {
        result.errors.push('Circular dependencies detected in symbol table');
        result.success = false;
      }
      
      console.log(`[EnhancedLinkingPass] ✅ Enhanced generation completed`);
      console.log(`[EnhancedLinkingPass] 📊 Results:`, result.summary);
      
    } catch (error: any) {
      result.errors.push(`Enhanced generation failed: ${error.message}`);
      result.success = false;
    }

    return result;
  }

  /**
   * Generate files with cross-file awareness
   */
  private async generateFilesWithAwareness(
    irData: any,
    projectPath: string,
    aiService: any
  ): Promise<{ generatedFiles: string[]; errors: string[] }> {
    const generatedFiles: string[] = [];
    const errors: string[] = [];

    try {
      // Generate in dependency order with awareness
      const generationOrder = this.determineGenerationOrder(irData);
      
      for (const phase of generationOrder) {
        console.log(`[EnhancedLinkingPass] 📦 Generating ${phase.name}: ${phase.items.length} items`);
        
        for (const item of phase.items) {
          try {
            const filePath = await this.generateFileWithContext(item, phase.type, projectPath, aiService, irData);
            generatedFiles.push(filePath);
            
            // Immediately register the file for cross-file awareness
            await this.smartImportResolver.registerGeneratedFiles([filePath]);
            
            console.log(`[EnhancedLinkingPass] ✅ Generated: ${path.basename(filePath)}`);
            
          } catch (error: any) {
            errors.push(`Failed to generate ${phase.type} ${item.name}: ${error.message}`);
          }
        }
      }
      
    } catch (error: any) {
      errors.push(`File generation failed: ${error.message}`);
    }

    return { generatedFiles, errors };
  }

  /**
   * Determine generation order based on dependencies
   */
  private determineGenerationOrder(irData: any): Array<{ name: string; type: string; items: any[] }> {
    const order = [];
    
    // Phase 1: Backend Models (no dependencies)
    if (irData.backend?.models) {
      order.push({
        name: 'Backend Models',
        type: 'model',
        items: irData.backend.models
      });
    }
    
    // Phase 2: Backend DTOs (may depend on models)
    if (irData.backend?.dtos) {
      order.push({
        name: 'Backend DTOs',
        type: 'dto',
        items: irData.backend.dtos
      });
    }
    
    // Phase 3: Backend Services (depend on models and DTOs)
    if (irData.backend?.services) {
      order.push({
        name: 'Backend Services',
        type: 'service',
        items: irData.backend.services
      });
    }
    
    // Phase 4: Backend Controllers (depend on services)
    if (irData.backend?.controllers) {
      order.push({
        name: 'Backend Controllers',
        type: 'controller',
        items: irData.backend.controllers
      });
    }
    
    // Phase 5: Frontend Services (depend on backend models)
    if (irData.frontend?.services) {
      order.push({
        name: 'Frontend Services',
        type: 'frontend-service',
        items: irData.frontend.services
      });
    }
    
    // Phase 6: Frontend Components (depend on frontend services)
    if (irData.frontend?.components) {
      order.push({
        name: 'Frontend Components',
        type: 'frontend-component',
        items: irData.frontend.components
      });
    }
    
    // Phase 7: Frontend Pages (depend on components)
    if (irData.frontend?.pages) {
      order.push({
        name: 'Frontend Pages',
        type: 'frontend-page',
        items: irData.frontend.pages
      });
    }
    
    // Phase 8: Frontend Hooks (depend on services)
    if (irData.frontend?.hooks) {
      order.push({
        name: 'Frontend Hooks',
        type: 'frontend-hook',
        items: irData.frontend.hooks
      });
    }
    
    return order;
  }

  /**
   * Generate a file with context awareness
   */
  private async generateFileWithContext(
    item: any,
    type: string,
    projectPath: string,
    aiService: any,
    irData: any
  ): Promise<string> {
    let filePath: string;
    let content: string;
    
    // Generate content using template engine
    switch (type) {
      case 'model':
        const modelResult = await this.templateEngine.generateModel(item, projectPath);
        content = await this.templateEngine.fillAICavities(
          modelResult.content,
          modelResult.cavities,
          aiService,
          irData
        );
        filePath = path.join(projectPath, 'backend', 'src', 'models', `${item.name}.ts`);
        break;
        
      case 'dto':
        const dtoResult = await this.templateEngine.generateDTO(item, projectPath);
        content = await this.templateEngine.fillAICavities(
          dtoResult.content,
          dtoResult.cavities,
          aiService,
          irData
        );
        filePath = path.join(projectPath, 'backend', 'src', 'dto', `${item.name}.ts`);
        break;
        
      case 'service':
        const serviceResult = await this.templateEngine.generateService(item, projectPath);
        content = await this.templateEngine.fillAICavities(
          serviceResult.content,
          serviceResult.cavities,
          aiService,
          irData
        );
        filePath = path.join(projectPath, 'backend', 'src', 'services', `${item.className}.ts`);
        break;
        
      case 'controller':
        const controllerResult = await this.templateEngine.generateController(item, projectPath);
        content = await this.templateEngine.fillAICavities(
          controllerResult.content,
          controllerResult.cavities,
          aiService,
          irData
        );
        filePath = path.join(projectPath, 'backend', 'src', 'controllers', `${item.name}.ts`);
        break;
        
      case 'frontend-service':
        content = this.generateFrontendService(item);
        filePath = path.join(projectPath, 'frontend', 'src', 'services', `${item.name}.ts`);
        break;
        
      case 'frontend-component':
        content = this.generateFrontendComponent(item);
        filePath = path.join(projectPath, 'frontend', 'src', 'components', `${item.name}.tsx`);
        break;
        
      case 'frontend-page':
        content = this.generateFrontendPage(item);
        filePath = path.join(projectPath, 'frontend', 'src', 'pages', `${item.name}.tsx`);
        break;
        
      case 'frontend-hook':
        content = this.generateFrontendHook(item);
        filePath = path.join(projectPath, 'frontend', 'src', 'hooks', `${item.name}.ts`);
        break;
        
      default:
        throw new Error(`Unknown file type: ${type}`);
    }
    
    // Write file
    await this.writeFile(filePath, content);
    
    // Register symbol immediately
    await this.registerSymbol(filePath, type, item.name || item.className, content);
    
    return filePath;
  }

  /**
   * Write file to disk
   */
  private async writeFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    await promisify(fs.mkdir)(dir, { recursive: true });
    await promisify(fs.writeFile)(filePath, content, 'utf-8');
  }

  /**
   * Register symbol with enhanced parsing
   */
  private async registerSymbol(filePath: string, type: string, name: string, content: string): Promise<void> {
    try {
      const sourceFile = this.project.createSourceFile(filePath, content);
      
      const exports: string[] = [];
      const methods: Record<string, { params: { name: string; tsType: string }[]; returns: string }> = {};
      
      // Extract exports
      sourceFile.getExportDeclarations().forEach(exportDecl => {
        exportDecl.getNamedExports().forEach(namedExport => {
          exports.push(namedExport.getName());
        });
      });
      
      // Extract default export
      const defaultExport = sourceFile.getDefaultExportSymbol();
      if (defaultExport) {
        exports.push(defaultExport.getName());
      }
      
      // Extract class methods
      sourceFile.getClasses().forEach(classDecl => {
        const className = classDecl.getName();
        if (className) {
          exports.push(className);
          
          classDecl.getMethods().forEach(method => {
            const methodName = method.getName();
            const params = method.getParameters().map(param => ({
              name: param.getName(),
              tsType: param.getType().getText()
            }));
            const returns = method.getReturnType().getText();
            methods[methodName] = { params, returns };
          });
        }
      });
      
      // Extract interfaces
      sourceFile.getInterfaces().forEach(interfaceDecl => {
        const interfaceName = interfaceDecl.getName();
        if (interfaceName) {
          exports.push(interfaceName);
        }
      });
      
      // Create symbol record
      const symbolRecord: SymbolRecord = {
        kind: type as any,
        name,
        filePath,
        exports: exports.length > 0 ? exports : [name],
        methods: Object.keys(methods).length > 0 ? methods : undefined,
        description: `Generated ${type} for ${name}`
      };
      
      this.symbolTable.addSymbol(symbolRecord);
      
    } catch (error: any) {
      console.warn(`[EnhancedLinkingPass] Could not register symbol for ${filePath}: ${error.message}`);
    }
  }

  /**
   * Analyze cross-file dependencies
   */
  async analyzeDependencies(filePaths: string[]): Promise<any> {
    console.log(`[EnhancedLinkingPass] 🔍 Analyzing cross-file dependencies for ${filePaths.length} files`);
    
    const analysis = this.smartImportResolver.analyzeCrossFileDependencies(filePaths);
    
    console.log(`[EnhancedLinkingPass] 📊 Analysis results:`);
    console.log(`  - Missing imports: ${analysis.missingImports.length}`);
    console.log(`  - Unused imports: ${analysis.unusedImports.length}`);
    console.log(`  - Cross-file dependencies: ${Object.keys(analysis.crossFileDependencies).length}`);
    console.log(`  - Import suggestions: ${analysis.suggestions.length}`);
    
    return analysis;
  }

  /**
   * Validate generated code
   */
  async validateGeneratedCode(filePaths: string[]): Promise<{
    success: boolean;
    errors: string[];
    warnings: string[];
  }> {
    console.log(`[EnhancedLinkingPass] ✅ Validating generated code for ${filePaths.length} files`);
    
    const result = {
      success: true,
      errors: [] as string[],
      warnings: [] as string[]
    };
    
    // Validate symbol table
    const validation = this.symbolTable.validate();
    result.errors.push(...validation.errors);
    result.warnings.push(...validation.warnings);
    
    // Check for circular dependencies
    if (this.symbolTable.hasCircularDependencies()) {
      result.errors.push('Circular dependencies detected');
      result.success = false;
    }
    
    // Validate file structure
    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) {
        result.errors.push(`Generated file not found: ${filePath}`);
        result.success = false;
      } else {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content.length === 0) {
          result.warnings.push(`Empty file generated: ${filePath}`);
        }
      }
    }
    
    console.log(`[EnhancedLinkingPass] 📊 Validation results: ${result.errors.length} errors, ${result.warnings.length} warnings`);
    
    return result;
  }

  /**
   * Get generation statistics
   */
  getGenerationStats(): {
    symbolTableStats: any;
    fileStats: {
      totalFiles: number;
      byType: Record<string, number>;
    };
  } {
    const symbolStats = this.symbolTable.getStats();
    
    const fileStats = {
      totalFiles: 0,
      byType: {} as Record<string, number>
    };
    
    // Count files by type (this would need to be tracked during generation)
    
    return {
      symbolTableStats: symbolStats,
      fileStats
    };
  }

  /**
   * Generate frontend service
   */
  private generateFrontendService(service: any): string {
    const methods = service.methods?.map((method: any) => {
      const params = method.params?.map((param: any) => `${param.name}: ${param.tsType}`).join(', ') || '';
      
      let implementation = '';
      if (method.name === 'getAll') {
        implementation = `
    try {
      const response = await apiClient.get('/${service.name.toLowerCase().replace('service', 's')}');
      return response.data;
    } catch (error) {
      console.error('Error fetching ${service.name.toLowerCase().replace('service', 's')}:', error);
      throw new Error('Failed to fetch ${service.name.toLowerCase().replace('service', 's')}');
    }`;
      } else if (method.name === 'getById') {
        implementation = `
    try {
      const response = await apiClient.get(\`/${service.name.toLowerCase().replace('service', 's')}/\${id}\`);
      return response.data;
    } catch (error) {
      console.error('Error fetching ${service.name.toLowerCase().replace('service', '')} by ID:', error);
      return null;
    }`;
      } else if (method.name === 'create') {
        implementation = `
    try {
      const response = await apiClient.post('/${service.name.toLowerCase().replace('service', 's')}', data);
      return response.data;
    } catch (error) {
      console.error('Error creating ${service.name.toLowerCase().replace('service', '')}:', error);
      throw new Error('Failed to create ${service.name.toLowerCase().replace('service', '')}');
    }`;
      } else if (method.name === 'update') {
        implementation = `
    try {
      const response = await apiClient.put(\`/${service.name.toLowerCase().replace('service', 's')}/\${id}\`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating ${service.name.toLowerCase().replace('service', '')}:', error);
      return null;
    }`;
      } else if (method.name === 'delete') {
        implementation = `
    try {
      await apiClient.delete(\`/${service.name.toLowerCase().replace('service', 's')}/\${id}\`);
      return true;
    } catch (error) {
      console.error('Error deleting ${service.name.toLowerCase().replace('service', '')}:', error);
      return false;
    }`;
      } else {
        implementation = `
    // TODO: Implement ${method.name}
    throw new Error('Not implemented');`;
      }
      
      return `
  async ${method.name}(${params}): ${method.returns} {${implementation}
  }`;
    }).join('') || '';

    return `import { apiClient } from './apiClient';

export class ${service.name} {
${methods}
}

export default ${service.name};`;
  }

  /**
   * Generate frontend component
   */
  private generateFrontendComponent(component: any): string {
    const props = component.props?.map((prop: any) => `  ${prop.name}${prop.required ? '' : '?'}: ${prop.tsType};`).join('\n') || '';
    const state = component.state?.map((state: any) => `  const [${state.name}, set${state.name.charAt(0).toUpperCase() + state.name.slice(1)}] = useState<${state.tsType}>(${state.tsType.includes('boolean') ? 'false' : 'null'});`).join('\n') || '';
    
    // Generate proper method implementations
    const methods = component.methods?.map((method: any) => {
      const params = method.params?.map((param: any) => `${param.name}: ${param.tsType}`).join(', ') || '';
      
      let implementation = '';
      if (method.name === 'handleCreate') {
        implementation = `
    try {
      setLoading(true);
      setError(null);
      if (props.onCreate) {
        await props.onCreate(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setLoading(false);
    }`;
      } else if (method.name === 'handleUpdate') {
        implementation = `
    try {
      setLoading(true);
      setError(null);
      if (props.onUpdate) {
        await props.onUpdate(id, data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
    }`;
      } else if (method.name === 'handleDelete') {
        implementation = `
    try {
      setLoading(true);
      setError(null);
      if (props.onDelete) {
        await props.onDelete(id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setLoading(false);
    }`;
      } else {
        implementation = `
    // TODO: Implement ${method.name}`;
      }
      
      return `
  const ${method.name} = async (${params}) => {${implementation}
  };`;
    }).join('') || '';

    // Generate proper UI implementation
    const componentName = component.name.replace('Component', '');
    const uiImplementation = `
      <div className="${component.name.toLowerCase()}-container">
        <h2>${componentName} Management</h2>
        
        {loading && <div className="loading">Loading...</div>}
        {error && <div className="error">Error: {error}</div>}
        
        <div className="controls">
          <button 
            onClick={() => handleCreate({} as any)} 
            disabled={loading}
            className="create-btn"
          >
            Create New ${componentName}
          </button>
        </div>
        
        <div className="list">
          {props.data?.map((item: any) => (
            <div key={item.id} className="item">
              <h3>{item.name || item.title || item.id}</h3>
              <div className="actions">
                <button 
                  onClick={() => handleUpdate(item.id, item)}
                  disabled={loading}
                  className="edit-btn"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(item.id)}
                  disabled={loading}
                  className="delete-btn"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>`;

    return `import React, { useState, useEffect } from 'react';

interface ${component.name}Props {
${props}
}

export const ${component.name}: React.FC<${component.name}Props> = (props) => {
${state}

${methods}

  return (
${uiImplementation}
  );
};

export default ${component.name};`;
  }

  /**
   * Generate frontend page
   */
  private generateFrontendPage(page: any): string {
    const components = page.components?.map((comp: string) => `import { ${comp} } from '../components/${comp}';`).join('\n') || '';

    return `import React from 'react';
${components}

export const ${page.name}: React.FC = () => {
  return (
    <div className="${page.name.toLowerCase()}-page">
      <h1>${page.name}</h1>
      {/* TODO: Implement page content */}
    </div>
  );
};

export default ${page.name};`;
  }

  /**
   * Generate frontend hook
   */
  private generateFrontendHook(hook: any): string {
    const params = hook.params?.map((param: any) => `${param.name}: ${param.tsType}`).join(', ') || '';

    let implementation = '';
    if (hook.name === 'useAuth') {
      implementation = `
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      // TODO: Implement actual login logic
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem('token', userData.token);
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('token');
    if (token) {
      // TODO: Validate token and set user
    }
  }, []);

  return { user, login, logout, loading };`;
    } else if (hook.name === 'useApi') {
      implementation = `
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(endpoint);
      
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        throw new Error('API request failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [endpoint]);

  return { data, loading, error, refetch };`;
    } else {
      implementation = `
  // TODO: Implement ${hook.name} hook
  return {
    // TODO: Return hook data
  };`;
    }

    return `import { useState, useEffect } from 'react';

export const ${hook.name} = (${params}) => {${implementation}
};

export default ${hook.name};`;
  }
}

export default EnhancedLinkingPass; 