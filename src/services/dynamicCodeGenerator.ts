import { AICodeGenerationService } from './aiCodeGenerationService';

export interface CodeGenerationRequest {
  type: 'model' | 'service' | 'controller' | 'component' | 'page' | 'hook';
  name: string;
  description: string;
  requirements: string[];
  dependencies?: string[];
  context?: any;
}

export interface GeneratedCode {
  content: string;
  imports: string[];
  exports: string[];
  dependencies: string[];
}

export class DynamicCodeGenerator {
  private aiService: AICodeGenerationService;

  constructor() {
    this.aiService = new AICodeGenerationService();
  }

  /**
   * Generate code dynamically based on user requirements
   */
  async generateCode(request: CodeGenerationRequest): Promise<GeneratedCode> {
    const prompt = this.createPrompt(request);
    
    try {
      // Use the AI service's makeAIRequest method directly
      const response = await this.aiService['makeAIRequest'](prompt);
      const parsed = this.parseAIResponse(response);
      
      return {
        content: parsed.content,
        imports: parsed.imports || [],
        exports: parsed.exports || [],
        dependencies: parsed.dependencies || []
      };
    } catch (error) {
      console.error(`[DynamicCodeGenerator] Error generating ${request.type}:`, error);
      return this.generateFallbackCode(request);
    }
  }

  /**
   * Create a focused prompt for code generation
   */
  private createPrompt(request: CodeGenerationRequest): string {
    const basePrompt = `Generate a complete, production-ready ${request.type} for "${request.name}".

Requirements:
${request.requirements.map(req => `- ${req}`).join('\n')}

${request.dependencies ? `Dependencies: ${request.dependencies.join(', ')}` : ''}

${request.context ? `Context: ${JSON.stringify(request.context, null, 2)}` : ''}

Generate ONLY the TypeScript/React code with:
1. Proper imports
2. Complete implementations (no TODO comments)
3. Error handling
4. TypeScript types
5. Best practices

Return ONLY the code, no explanations.`;

    return basePrompt;
  }

  /**
   * Parse AI response to extract code and metadata
   */
  private parseAIResponse(response: string): any {
    // Extract code blocks
    const codeMatch = response.match(/```(?:typescript|ts|jsx|tsx)?\s*\n([\s\S]*?)\n```/);
    const content = codeMatch ? codeMatch[1] : response;

    // Extract imports
    const importMatches = content.match(/import\s+.*?from\s+['"][^'"]+['"];?/g) || [];
    const imports = importMatches.map(imp => imp.trim());

    // Extract exports
    const exportMatches = content.match(/export\s+(?:default\s+)?(?:class|interface|function|const)\s+(\w+)/g) || [];
    const exports = exportMatches.map(exp => {
      const match = exp.match(/(\w+)/);
      return match ? match[1] : '';
    }).filter(Boolean);

    // Extract dependencies from imports
    const dependencies = imports.map(imp => {
      const match = imp.match(/import\s+.*?from\s+['"]([^'"]+)['"]/);
      return match ? match[1] : '';
    }).filter(Boolean);

    return { content, imports, exports, dependencies };
  }

  /**
   * Generate fallback code if AI fails
   */
  private generateFallbackCode(request: CodeGenerationRequest): GeneratedCode {
    const name = request.name;
    
    switch (request.type) {
      case 'model':
        return {
          content: `import { Schema, model, Document } from 'mongoose';

export interface ${name} extends Document {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const ${name}Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
}, { timestamps: true });

export default model<${name}>('${name}', ${name}Schema);`,
          imports: ['mongoose'],
          exports: [name, `${name}Schema`],
          dependencies: ['mongoose']
        };

      case 'service':
        return {
          content: `import { ${name} } from '../models/${name}';

export class ${name}Service {
  async findAll(): Promise<${name}[]> {
    try {
      return await ${name}.find().exec();
    } catch (error) {
      console.error('Error fetching ${name}s:', error);
      throw new Error('Failed to fetch ${name}s');
    }
  }

  async findById(id: string): Promise<${name} | null> {
    try {
      return await ${name}.findById(id).exec();
    } catch (error) {
      console.error('Error fetching ${name}:', error);
      return null;
    }
  }

  async create(data: Partial<${name}>): Promise<${name}> {
    try {
      return await ${name}.create(data);
    } catch (error) {
      console.error('Error creating ${name}:', error);
      throw new Error('Failed to create ${name}');
    }
  }

  async update(id: string, data: Partial<${name}>): Promise<${name} | null> {
    try {
      return await ${name}.findByIdAndUpdate(id, data, { new: true }).exec();
    } catch (error) {
      console.error('Error updating ${name}:', error);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await ${name}.findByIdAndDelete(id).exec();
      return !!result;
    } catch (error) {
      console.error('Error deleting ${name}:', error);
      return false;
    }
  }
}

export default ${name}Service;`,
          imports: [`../models/${name}`],
          exports: [`${name}Service`],
          dependencies: [`../models/${name}`]
        };

      case 'controller':
        return {
          content: `import { Request, Response } from 'express';
import { ${name}Service } from '../services/${name}Service';

export class ${name}Controller {
  constructor(private ${name.toLowerCase()}Service: ${name}Service) {}

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const items = await this.${name.toLowerCase()}Service.findAll();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch items' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const item = await this.${name.toLowerCase()}Service.findById(id);
      if (!item) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch item' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const item = await this.${name.toLowerCase()}Service.create(req.body);
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create item' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const item = await this.${name.toLowerCase()}Service.update(id, req.body);
      if (!item) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update item' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await this.${name.toLowerCase()}Service.delete(id);
      if (!success) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete item' });
    }
  }
}

export default ${name}Controller;`,
          imports: ['express', `../services/${name}Service`],
          exports: [`${name}Controller`],
          dependencies: ['express', `../services/${name}Service`]
        };

      case 'component':
        return {
          content: `import React, { useState, useEffect } from 'react';

interface ${name}Props {
  data: any[];
  onCreate?: (data: any) => Promise<void>;
  onUpdate?: (id: string, data: any) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const ${name}: React.FC<${name}Props> = (props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (data: any) => {
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
    }
  };

  const handleUpdate = async (id: string, data: any) => {
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
    }
  };

  const handleDelete = async (id: string) => {
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
    }
  };

  return (
    <div className="${name.toLowerCase()}-container">
      <h2>${name} Management</h2>
      
      {loading && <div className="loading">Loading...</div>}
      {error && <div className="error">Error: {error}</div>}
      
      <div className="controls">
        <button 
          onClick={() => handleCreate({})} 
          disabled={loading}
          className="create-btn"
        >
          Create New ${name}
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
    </div>
  );
};

export default ${name};`,
          imports: ['react'],
          exports: [name],
          dependencies: ['react']
        };

      default:
        return {
          content: `// Fallback ${request.type} for ${name}`,
          imports: [],
          exports: [name],
          dependencies: []
        };
    }
  }
}

export default DynamicCodeGenerator; 