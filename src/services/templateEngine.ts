import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { ApplicationIR, ClassIR, ServiceIR, MethodIR, DtoIR } from '../types/ir';

export interface TemplateContext {
  className?: string;
  serviceName?: string;
  methodName?: string;
  params?: Array<{ name: string; tsType: string; optional?: boolean }>;
  returns?: string;
  description?: string;
  imports?: string[];
  dependencies?: string[];
  [key: string]: any;
}

export interface AICavity {
  id: string;
  type: 'method-body' | 'validation-logic' | 'business-logic' | 'error-handling';
  context: string;
  placeholder: string;
  description: string;
}

export class TemplateEngine {
  private templatesDir: string;

  constructor(templatesDir: string = path.join(__dirname, '../templates')) {
    this.templatesDir = templatesDir;
  }

  /**
   * Generate a model file from IR
   */
  async generateModel(modelIR: ClassIR, projectPath: string): Promise<{ content: string; cavities: AICavity[] }> {
    const template = await this.loadTemplate('model.mustache');
    const context = this.createModelContext(modelIR);
    const cavities = this.identifyModelCavities(modelIR);
    
    const content = this.renderTemplate(template, context);
    
    return { content, cavities };
  }

  /**
   * Generate a service file from IR
   */
  async generateService(serviceIR: ServiceIR, projectPath: string): Promise<{ content: string; cavities: AICavity[] }> {
    const template = await this.loadTemplate('service.mustache');
    const context = this.createServiceContext(serviceIR);
    const cavities = this.identifyServiceCavities(serviceIR);
    
    const content = this.renderTemplate(template, context);
    
    return { content, cavities };
  }

  /**
   * Generate a controller file from IR
   */
  async generateController(controllerIR: any, projectPath: string): Promise<{ content: string; cavities: AICavity[] }> {
    const template = await this.loadTemplate('controller.mustache');
    const context = this.createControllerContext(controllerIR);
    const cavities = this.identifyControllerCavities(controllerIR);
    
    const content = this.renderTemplate(template, context);
    
    return { content, cavities };
  }

  /**
   * Generate a DTO file from IR
   */
  async generateDTO(dtoIR: DtoIR, projectPath: string): Promise<{ content: string; cavities: AICavity[] }> {
    const template = await this.loadTemplate('dto.mustache');
    const context = this.createDTOContext(dtoIR);
    const cavities = this.identifyDTOCavities(dtoIR);
    
    const content = this.renderTemplate(template, context);
    
    return { content, cavities };
  }

  /**
   * Fill AI cavities in generated content
   */
  async fillAICavities(
    content: string, 
    cavities: AICavity[], 
    aiService: any,
    context: any
  ): Promise<string> {
    let filledContent = content;
    
    for (const cavity of cavities) {
      const prompt = this.createCavityPrompt(cavity, context);
      const aiResponse = await aiService.makeAIRequest(prompt);
      const filledCode = this.extractCodeFromAIResponse(aiResponse);
      
      filledContent = filledContent.replace(cavity.placeholder, filledCode);
    }
    
    return filledContent;
  }

  /**
   * Load template from file
   */
  private async loadTemplate(templateName: string): Promise<string> {
    const templatePath = path.join(this.templatesDir, templateName);
    try {
      return await promisify(fs.readFile)(templatePath, 'utf-8');
    } catch (error) {
      console.warn(`[TemplateEngine] Could not load template ${templateName}, using default`);
      return this.getDefaultTemplate(templateName);
    }
  }

  /**
   * Get default template if file doesn't exist
   */
  private getDefaultTemplate(templateName: string): string {
    const templates: Record<string, string> = {
      'model.mustache': `import { Schema, model, Document } from 'mongoose';
import { z } from 'zod';

export interface {{className}} extends Document {
  {{#fields}}
  {{name}}: {{tsType}};
  {{/fields}}
  {{#relations}}
  {{from}}?: {{to}};
  {{/relations}}
  createdAt: Date;
  updatedAt: Date;
}

export const {{className}}Schema = z.object({
  {{#fields}}
  {{name}}: {{#required}}z.{{tsType}}(){{/required}}{{^required}}z.{{tsType}}().optional(){{/required}},
  {{/fields}}
});

export class {{className}}Model {
  private static model = model<{{className}}>('{{className}}', new Schema({
    {{#fields}}
    {{name}}: {
      type: {{#isString}}String{{/isString}}{{#isNumber}}Number{{/isNumber}}{{#isBoolean}}Boolean{{/isBoolean}}{{#isDate}}Date{{/isDate}},
      required: {{required}},
      {{#unique}}unique: true,{{/unique}}
      {{#default}}default: {{default}},{{/default}}
    },
    {{/fields}}
    {{#relations}}
    {{from}}: {
      type: Schema.Types.ObjectId,
      ref: '{{to}}',
    },
    {{/relations}}
  }, {
    timestamps: true,
  }));

  {{#methods}}
  static async {{name}}({{#params}}{{name}}{{^last}}, {{/last}}{{/params}}): {{returns}} {
    // BEGIN-AI {{name}}
    /* AI will generate the method implementation */
    {{placeholder}}
    // END-AI
  }
  {{/methods}}

  static async findById(id: string): Promise<{{className}} | null> {
    return this.model.findById(id).exec();
  }

  static async create(data: Partial<{{className}}>): Promise<{{className}}> {
    return this.model.create(data);
  }

  static async update(id: string, data: Partial<{{className}}>): Promise<{{className}} | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  static async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }
}

export default {{className}}Model;`,

      'service.mustache': `import { {{#imports}}{{.}}{{^last}}, {{/last}}{{/imports}} } from '{{importPath}}';

export class {{serviceName}} {
  {{#dependencies}}
  constructor(private {{dependencyName}}: {{dependencyType}}) {}
  {{/dependencies}}

  {{#methods}}
  async {{name}}({{#params}}{{name}}: {{tsType}}{{^last}}, {{/last}}{{/params}}): {{returns}} {
    // BEGIN-AI {{name}}
    /* AI will generate the method implementation */
    // TODO: Implement {{name}} method
    // END-AI
  }
  {{/methods}}
}

export default {{serviceName}};`,

      'controller.mustache': `import { Request, Response } from 'express';
import { {{#imports}}{{.}}, {{/imports}} } from '{{importPath}}';

export class {{controllerName}} {
  constructor(private {{serviceName}}: {{serviceType}}) {}

  {{#routes}}
  async {{handler}}(req: Request, res: Response): Promise<void> {
    try {
      // BEGIN-AI {{handler}}
      /* AI will generate the route handler implementation */
      {{placeholder}}
      // END-AI
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  {{/routes}}
}

export default {{controllerName}};`,

      'dto.mustache': `import { z } from 'zod';

export interface {{dtoName}} {
  {{#shape}}
  {{key}}: {{value}};
  {{/shape}}
}

export const {{dtoName}}Schema = z.object({
  {{#shape}}
  {{key}}: z.{{value}}(){{#required}}.required(){{/required}}{{^required}}.optional(){{/required}},
  {{/shape}}
});

export type {{dtoName}}Input = z.infer<typeof {{dtoName}}Schema>;`
    };

    return templates[templateName] || `// Default template for ${templateName}`;
  }

  /**
   * Create context for model generation
   */
  private createModelContext(modelIR: ClassIR): TemplateContext {
    return {
      className: modelIR.name,
      fields: modelIR.fields.map(field => ({
        ...field,
        isString: field.tsType === 'string',
        isNumber: field.tsType === 'number',
        isBoolean: field.tsType === 'boolean',
        isDate: field.tsType === 'Date'
      })),
      relations: modelIR.relations || [],
      methods: modelIR.methods || [],
      imports: ['Schema', 'model', 'Document'],
      dependencies: modelIR.relations?.map(r => r.to) || []
    };
  }

  /**
   * Create context for service generation
   */
  private createServiceContext(serviceIR: ServiceIR): TemplateContext {
    return {
      serviceName: serviceIR.className,
      methods: serviceIR.methods || [],
      dependencies: serviceIR.dependsOn || [],
      imports: serviceIR.dependsOn || [],
      importPath: '../models'
    };
  }

  /**
   * Create context for controller generation
   */
  private createControllerContext(controllerIR: any): TemplateContext {
    return {
      controllerName: controllerIR.name,
      serviceName: controllerIR.service.toLowerCase(),
      serviceType: controllerIR.service,
      routes: controllerIR.routes || [],
      imports: [controllerIR.service],
      importPath: '../services'
    };
  }

  /**
   * Create context for DTO generation
   */
  private createDTOContext(dtoIR: DtoIR): TemplateContext {
    return {
      dtoName: dtoIR.name,
      shape: Object.entries(dtoIR.shape).map(([key, value]) => ({
        key,
        value,
        required: true // Default to required, can be overridden
      }))
    };
  }

  /**
   * Identify AI cavities in model
   */
  private identifyModelCavities(modelIR: ClassIR): AICavity[] {
    const cavities: AICavity[] = [];
    
    modelIR.methods?.forEach(method => {
      cavities.push({
        id: `${modelIR.name}_${method.name}`,
        type: 'method-body',
        context: `Model method ${method.name} for ${modelIR.name}`,
        placeholder: `// TODO: Implement ${method.name} method`,
        description: method.description || `Implement ${method.name} method for ${modelIR.name}`
      });
    });
    
    return cavities;
  }

  /**
   * Identify AI cavities in service
   */
  private identifyServiceCavities(serviceIR: ServiceIR): AICavity[] {
    const cavities: AICavity[] = [];
    
    serviceIR.methods?.forEach(method => {
      cavities.push({
        id: `${serviceIR.className}_${method.name}`,
        type: 'method-body',
        context: `Service method ${method.name} for ${serviceIR.className}`,
        placeholder: `// TODO: Implement ${method.name} method`,
        description: method.description || `Implement ${method.name} method for ${serviceIR.className}`
      });
    });
    
    return cavities;
  }

  /**
   * Identify AI cavities in controller
   */
  private identifyControllerCavities(controllerIR: any): AICavity[] {
    const cavities: AICavity[] = [];
    
    controllerIR.routes?.forEach((route: any) => {
      cavities.push({
        id: `${controllerIR.name}_${route.handler}`,
        type: 'method-body',
        context: `Controller method ${route.handler} for ${route.method.toUpperCase()} ${route.path}`,
        placeholder: `// TODO: Implement ${route.handler} handler`,
        description: route.description || `Implement ${route.handler} handler for ${route.method.toUpperCase()} ${route.path}`
      });
    });
    
    return cavities;
  }

  /**
   * Identify AI cavities in DTO
   */
  private identifyDTOCavities(dtoIR: DtoIR): AICavity[] {
    const cavities: AICavity[] = [];
    
    // Add validation logic cavity if validation rules are complex
    if (dtoIR.validation && Object.keys(dtoIR.validation).length > 0) {
      cavities.push({
        id: `${dtoIR.name}_validation`,
        type: 'validation-logic',
        context: `Validation logic for ${dtoIR.name} DTO`,
        placeholder: `// TODO: Add custom validation logic`,
        description: `Implement custom validation logic for ${dtoIR.name} DTO`
      });
    }
    
    return cavities;
  }

  /**
   * Create prompt for AI cavity
   */
  private createCavityPrompt(cavity: AICavity, context: any): string {
    return `Generate ${cavity.type} for ${cavity.context}.

Context:
${JSON.stringify(context, null, 2)}

Requirements:
1. Generate complete, functional code
2. Use proper TypeScript types
3. Include proper error handling
4. Make it production-ready
5. Follow best practices for ${cavity.type}

Generate ONLY the implementation code. No explanations or additional text.

Example output:
${cavity.description}`;
  }

  /**
   * Extract code from AI response
   */
  private extractCodeFromAIResponse(response: string): string {
    // Remove markdown code blocks
    response = response.replace(/```typescript\s*/g, '').replace(/```\s*$/g, '');
    response = response.replace(/```ts\s*/g, '').replace(/```\s*$/g, '');
    response = response.replace(/```\s*/g, '').replace(/```\s*$/g, '');
    
    // Remove leading/trailing whitespace
    response = response.trim();
    
    return response;
  }

  /**
   * Simple template rendering (basic mustache-like functionality)
   */
  private renderTemplate(template: string, context: TemplateContext): string {
    let result = template;
    
    // Replace simple variables {{variable}}
    Object.entries(context).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, String(value));
      }
    });
    
    // Handle arrays with {{#array}}...{{/array}}
    const arrayRegex = /{{#(\w+)}}([\s\S]*?){{\/\1}}/g;
    result = result.replace(arrayRegex, (match, arrayName, template) => {
      const array = context[arrayName];
      if (Array.isArray(array)) {
        return array.map(item => {
          let itemTemplate = template;
          Object.entries(item).forEach(([key, value]) => {
            const itemRegex = new RegExp(`{{${key}}}`, 'g');
            itemTemplate = itemTemplate.replace(itemRegex, String(value));
          });
          return itemTemplate;
        }).join('\n');
      }
      return '';
    });
    
    // Handle conditionals with {{#condition}}...{{/condition}}
    const conditionalRegex = /{{#(\w+)}}([\s\S]*?){{\/\1}}/g;
    result = result.replace(conditionalRegex, (match, condition, template) => {
      const value = context[condition];
      if (value && value !== 'false' && value !== '0') {
        return template;
      }
      return '';
    });
    
    // Handle special cases like {{placeholder}} and {{.FF}}
    result = result.replace(/\{\{placeholder\}\}/g, '// TODO: Implement method');
    
    // Fix specific import patterns
    result = result.replace(/\{\{\.UU,\s*\}\}/g, 'UserService'); // User service import
    result = result.replace(/\{\{\.PP,\s*\}\}/g, 'ProjectService'); // Project service import
    result = result.replace(/\{\{\.TT,\s*\}\}/g, 'TaskService'); // Task service import
    result = result.replace(/\{\{\.MM,\s*\}\}/g, 'MessageService'); // Message service import
    result = result.replace(/\{\{\.CC,\s*\}\}/g, 'ClientService'); // Client service import
    result = result.replace(/\{\{\.FF,\s*\}\}/g, 'FreelancerService'); // Freelancer service import
    
    // Fix import statements with malformed patterns
    result = result.replace(/import\s*\{\s*\{\{\.\w+,\s*\}\}\s*\}\s*from\s*['"]\.\.\/services['"];?/g, (match) => {
      if (match.includes('{{.UU,')) return 'import { UserService } from \'../services\';';
      if (match.includes('{{.PP,')) return 'import { ProjectService } from \'../services\';';
      if (match.includes('{{.TT,')) return 'import { TaskService } from \'../services\';';
      if (match.includes('{{.MM,')) return 'import { MessageService } from \'../services\';';
      if (match.includes('{{.CC,')) return 'import { ClientService } from \'../services\';';
      if (match.includes('{{.FF,')) return 'import { FreelancerService } from \'../services\';';
      return 'import { Service } from \'../services\';'; // fallback
    });
    
    // Remove other malformed template variables
    result = result.replace(/\{\{\.\w+\}\}/g, ''); // Remove malformed template variables
    result = result.replace(/\{\{\.\w+,\s*\}\}/g, ''); // Remove malformed template variables with commas
    
    return result;
  }

  /**
   * Generate complete file with AI cavities filled
   */
  async generateCompleteFile(
    type: 'model' | 'service' | 'controller' | 'dto',
    irData: any,
    projectPath: string,
    aiService: any,
    context: any
  ): Promise<string> {
    let generationResult: { content: string; cavities: AICavity[] };
    
    switch (type) {
      case 'model':
        generationResult = await this.generateModel(irData, projectPath);
        break;
      case 'service':
        generationResult = await this.generateService(irData, projectPath);
        break;
      case 'controller':
        generationResult = await this.generateController(irData, projectPath);
        break;
      case 'dto':
        generationResult = await this.generateDTO(irData, projectPath);
        break;
      default:
        throw new Error(`Unknown file type: ${type}`);
    }
    
    // Fill AI cavities
    const completeContent = await this.fillAICavities(
      generationResult.content,
      generationResult.cavities,
      aiService,
      context
    );
    
    return completeContent;
  }
}

export default TemplateEngine; 