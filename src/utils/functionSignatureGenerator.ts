// src/utils/functionSignatureGenerator.ts
import { ComponentPlan } from './componentPlanGenerator';

/**
 * Function Signature Contract Interface
 * This represents the detailed contracts for code generation
 */
export interface FunctionSignatureContract {
  // Entity contracts (no interfaces, just types)
  entities: {
    [entityName: string]: {
      createInput: string;
      updateInput: string;
      properties: Array<{
        name: string;
        type: string;
        required: boolean;
        description?: string;
      }>;
    };
  };
  
  // Service contracts (no interfaces, just implementations)
  services: {
    [serviceName: string]: {
      implementation: {
        className: string;
        constructor: string;
        methods: Array<{
          name: string;
          signature: string;
          implementation: string;
          dependencies: string[];
        }>;
      };
    };
  };
  
  // Controller contracts (no interfaces, just implementations)
  controllers: {
    [controllerName: string]: {
      implementation: {
        className: string;
        routes: Array<{
          path: string;
          method: string;
          handler: string;
          middleware?: string[];
          validation?: string[];
        }>;
        dependencies: string[];
      };
    };
  };
  
  // Repository contracts (no interfaces, just implementations)
  repositories: {
    [repositoryName: string]: {
      implementation: {
        className: string;
        entity: string;
        methods: Array<{
          name: string;
          signature: string;
          implementation: string;
          sql?: string;
        }>;
      };
    };
  };
  
  // Main entry point contract
  index: {
    imports: Array<{
      type: 'controller' | 'service' | 'repository' | 'model' | 'config' | 'middleware';
      name: string;
      path: string;
    }>;
    configuration: {
      database: any;
      aws: any;
      application: any;
    };
    expressSetup: {
      middleware: string[];
      routes: Array<{
        path: string;
        method: string;
        controller: string;
        handler: string;
      }>;
      errorHandling: string[];
    };
    lambdaSetup: {
      handler: string;
      serverlessConfig: any;
    };
  };
  
  // Database schema
  database: {
    tables: Array<{
      name: string;
      entity: string;
      columns: Array<{
        name: string;
        type: string;
        nullable: boolean;
        primaryKey?: boolean;
        foreignKey?: {
          table: string;
          column: string;
        };
      }>;
      indexes?: Array<{
        name: string;
        columns: string[];
        unique?: boolean;
      }>;
    }>;
    migrations: string[];
  };
  
  // API routes configuration
  api: {
    baseUrl: string;
    routes: Array<{
      path: string;
      method: string;
      controller: string;
      handler: string;
      middleware: string[];
      validation: string[];
    }>;
    middleware: Array<{
      name: string;
      implementation: string;
    }>;
  };
  
  // Dependencies and imports
  dependencies: {
    imports: {
      [filePath: string]: string[];
    };
    exports: {
      [filePath: string]: string[];
    };
  };
  
  // Generation metadata
  metadata: {
    generatedFrom: 'componentPlan';
    componentPlan: ComponentPlan;
    generationTimestamp: string;
    version: string;
  };
}

/**
 * Generate function signature contracts from component plan
 */
export async function generateFunctionSignatureContracts(
  componentPlan: ComponentPlan,
  infrastructureContext?: any,
  semanticContext?: string
): Promise<FunctionSignatureContract> {
  console.log('[FunctionSignatureGenerator] Generating function signature contracts...');
  
  try {
    const contract: FunctionSignatureContract = {
      entities: {},
      services: {},
      controllers: {},
      repositories: {},
      index: {
        imports: [],
        configuration: {
          database: null,
          aws: null,
          application: null
        },
        expressSetup: {
          middleware: [],
          routes: [],
          errorHandling: []
        },
        lambdaSetup: {
          handler: '',
          serverlessConfig: null
        }
      },
      database: {
        tables: [],
        migrations: []
      },
      api: {
        baseUrl: componentPlan.integration.api?.baseUrl || '/api',
        routes: [],
        middleware: []
      },
      dependencies: {
        imports: {},
        exports: {}
      },
      metadata: {
        generatedFrom: 'componentPlan',
        componentPlan,
        generationTimestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };
    
    // Generate entity contracts
    await generateEntityContracts(componentPlan, contract);
    
    // Generate service contracts
    await generateServiceContracts(componentPlan, contract, semanticContext);
    
    // Generate controller contracts
    await generateControllerContracts(componentPlan, contract);
    
    // Generate repository contracts
    await generateRepositoryContracts(componentPlan, contract);
    
    // Generate index.ts contract
    await generateIndexContract(componentPlan, contract, infrastructureContext);
    
    // Generate database schema
    await generateDatabaseSchema(componentPlan, contract, infrastructureContext);
    
    // Generate API configuration
    await generateAPIConfiguration(componentPlan, contract);
    
    // Generate dependencies
    await generateDependencies(componentPlan, contract);
    
    console.log('[FunctionSignatureGenerator] ✅ Function signature contracts generated successfully');
    console.log(`[FunctionSignatureGenerator] Generated ${Object.keys(contract.entities).length} entities, ${Object.keys(contract.services).length} services, ${Object.keys(contract.controllers).length} controllers`);
    
    return contract;
    
  } catch (error: any) {
    console.error('[FunctionSignatureGenerator] ❌ Error generating function signature contracts:', error);
    throw new Error(`Failed to generate function signature contracts: ${error.message}`);
  }
}

/**
 * Generate entity contracts with TypeScript interfaces
 */
async function generateEntityContracts(
  componentPlan: ComponentPlan,
  contract: FunctionSignatureContract
): Promise<void> {
  for (const entity of componentPlan.entities) {
    const entityName = entity.name;
    
    // Generate create input interface
    const createInputCode = generateCreateInputInterface(entity);
    
    // Generate update input interface
    const updateInputCode = generateUpdateInputInterface(entity);
    
    contract.entities[entityName] = {
      createInput: createInputCode,
      updateInput: updateInputCode,
      properties: entity.properties
    };
  }
}

/**
 * Generate entity interface
 */
function generateEntityInterface(entity: ComponentPlan['entities'][0]): string {
  let interfaceCode = `export interface ${entity.name} {\n`;
  
  for (const property of entity.properties) {
    const optional = property.required ? '' : '?';
    const description = property.description ? ` // ${property.description}` : '';
    interfaceCode += `  ${property.name}${optional}: ${property.type};${description}\n`;
  }
  
  interfaceCode += `}\n`;
  return interfaceCode;
}

/**
 * Generate create input interface
 */
function generateCreateInputInterface(entity: ComponentPlan['entities'][0]): string {
  let interfaceCode = `export interface ${entity.name}CreateInput {\n`;
  
  for (const property of entity.properties) {
    // Skip auto-generated fields like id, createdAt, updatedAt
    if (['id', 'createdAt', 'updatedAt'].includes(property.name)) {
      continue;
    }
    
    const optional = property.required ? '' : '?';
    const description = property.description ? ` // ${property.description}` : '';
    interfaceCode += `  ${property.name}${optional}: ${property.type};${description}\n`;
  }
  
  interfaceCode += `}\n`;
  return interfaceCode;
}

/**
 * Generate update input interface
 */
function generateUpdateInputInterface(entity: ComponentPlan['entities'][0]): string {
  let interfaceCode = `export interface ${entity.name}UpdateInput {\n`;
  
  for (const property of entity.properties) {
    // Skip auto-generated fields like id, createdAt, updatedAt
    if (['id', 'createdAt', 'updatedAt'].includes(property.name)) {
      continue;
    }
    
    // All update fields are optional
    const description = property.description ? ` // ${property.description}` : '';
    interfaceCode += `  ${property.name}?: ${property.type};${description}\n`;
  }
  
  interfaceCode += `}\n`;
  return interfaceCode;
}

/**
 * Generate service contracts
 */
async function generateServiceContracts(
  componentPlan: ComponentPlan,
  contract: FunctionSignatureContract,
  semanticContext?: string
): Promise<void> {
  for (const service of componentPlan.services) {
    const serviceName = service.name;
    
    // Generate service implementation contract
    const implementation = generateServiceImplementation(service, componentPlan, semanticContext);
    
    contract.services[serviceName] = {
      implementation
    };
  }
}

/**
 * Generate service interface
 */
function generateServiceInterface(service: ComponentPlan['services'][0]): string {
  let interfaceCode = `export interface I${service.name} {\n`;
  
  for (const method of service.methods) {
    const params = method.parameters.map(p => `${p.name}: ${p.type}`).join(', ');
    const description = method.description ? ` // ${method.description}` : '';
    interfaceCode += `  ${method.name}(${params}): Promise<${method.returnType}>;${description}\n`;
  }
  
  interfaceCode += `}\n`;
  return interfaceCode;
}

/**
 * Generate service implementation contract
 */
function generateServiceImplementation(
  service: ComponentPlan['services'][0],
  componentPlan: ComponentPlan,
  semanticContext?: string
): FunctionSignatureContract['services'][string]['implementation'] {
  const className = service.name;
  
  // Generate constructor with dependencies
  const constructor = generateServiceConstructor(service, componentPlan);
  
  // Generate method implementations
  const methods = service.methods.map(method => {
    const signature = `${method.name}(${method.parameters.map(p => `${p.name}: ${p.type}`).join(', ')}): Promise<${method.returnType}>`;
    const implementation = generateServiceMethodImplementation(method, service, componentPlan, semanticContext);
    const dependencies = method.parameters.map(p => p.type).filter(type => 
      componentPlan.repositories.some(repo => repo.name === type.replace('Repository', ''))
    );
    
    return {
      name: method.name,
      signature,
      implementation,
      dependencies
    };
  });
  
  return {
    className,
    constructor,
    methods
  };
}

/**
 * Generate service constructor
 */
function generateServiceConstructor(
  service: ComponentPlan['services'][0],
  componentPlan: ComponentPlan
): string {
  const dependencies = service.dependencies.map(dep => {
    const repo = componentPlan.repositories.find(r => r.name === dep);
    if (repo) {
      return `private ${dep.charAt(0).toLowerCase() + dep.slice(1)}: I${dep}`;
    }
    return `private ${dep.charAt(0).toLowerCase() + dep.slice(1)}: I${dep}`;
  });
  
  if (dependencies.length === 0) {
    return `constructor() {}`;
  }
  
  return `constructor(${dependencies.join(', ')}) {}`;
}

/**
 * Generate service method implementation
 */
function generateServiceMethodImplementation(
  method: ComponentPlan['services'][0]['methods'][0],
  service: ComponentPlan['services'][0],
  componentPlan: ComponentPlan,
  semanticContext?: string
): string {
  const methodName = method.name;
  const entityName = service.name.replace('Service', '');
  
  // Determine the repository to use
  const repository = componentPlan.repositories.find(repo => repo.entity === entityName);
  
  if (!repository) {
    return `// TODO: Implement ${methodName} method`;
  }
  
  // Generate implementation based on method name pattern
  if (methodName.startsWith('create')) {
    return `return this.${repository.name.charAt(0).toLowerCase() + repository.name.slice(1)}.create(${method.parameters[0].name});`;
  } else if (methodName.startsWith('get') || methodName.startsWith('find')) {
    return `return this.${repository.name.charAt(0).toLowerCase() + repository.name.slice(1)}.findById(${method.parameters[0].name});`;
  } else if (methodName.startsWith('update')) {
    return `return this.${repository.name.charAt(0).toLowerCase() + repository.name.slice(1)}.update(${method.parameters[0].name}, ${method.parameters[1].name});`;
  } else if (methodName.startsWith('delete')) {
    return `return this.${repository.name.charAt(0).toLowerCase() + repository.name.slice(1)}.delete(${method.parameters[0].name});`;
  } else if (methodName.includes('ByUserId')) {
    return `return this.${repository.name.charAt(0).toLowerCase() + repository.name.slice(1)}.findByUserId(${method.parameters[0].name});`;
  }
  
  return `// TODO: Implement ${methodName} method`;
}

/**
 * Generate controller contracts
 */
async function generateControllerContracts(
  componentPlan: ComponentPlan,
  contract: FunctionSignatureContract
): Promise<void> {
  for (const controller of componentPlan.controllers) {
    const controllerName = controller.name;
    
    // Generate controller interface
    const interfaceCode = generateControllerInterface(controller);
    
    // Generate controller implementation contract
    const implementation = generateControllerImplementation(controller, componentPlan);
    
    contract.controllers[controllerName] = {
      implementation
    };
  }
}

/**
 * Generate controller interface
 */
function generateControllerInterface(controller: ComponentPlan['controllers'][0]): string {
  let interfaceCode = `export interface I${controller.name} {\n`;
  
  for (const route of controller.routes) {
    const params = route.parameters?.map(p => `${p.name}: ${p.type}`).join(', ') || '';
    const description = route.description ? ` // ${route.description}` : '';
    interfaceCode += `  ${route.calls}(${params}): Promise<any>;${description}\n`;
  }
  
  interfaceCode += `}\n`;
  return interfaceCode;
}

/**
 * Generate controller implementation contract
 */
function generateControllerImplementation(
  controller: ComponentPlan['controllers'][0],
  componentPlan: ComponentPlan
): FunctionSignatureContract['controllers'][string]['implementation'] {
  const className = controller.name;
  
  // Generate routes
  const routes = controller.routes.map(route => {
    const handler = generateControllerHandler(route, controller);
    const middleware = generateControllerMiddleware(route);
    const validation = generateControllerValidation(route);
    
    return {
      path: route.path,
      method: route.method,
      handler,
      middleware,
      validation
    };
  });
  
  // Generate dependencies
  const dependencies = controller.dependencies.map(dep => 
    `${dep.charAt(0).toLowerCase() + dep.slice(1)}: I${dep}`
  );
  
  return {
    className,
    routes,
    dependencies
  };
}

/**
 * Generate controller handler
 */
function generateControllerHandler(
  route: ComponentPlan['controllers'][0]['routes'][0],
  controller: ComponentPlan['controllers'][0]
): string {
  const serviceName = controller.dependencies[0]; // Assume first dependency is the service
  const serviceInstance = serviceName.charAt(0).toLowerCase() + serviceName.slice(1);
  
  return `async (req: Request, res: Response) => {
    try {
      const result = await this.${serviceInstance}.${route.calls}(${route.parameters?.map(p => 
        p.source === 'body' ? 'req.body' : 
        p.source === 'params' ? `req.params.${p.name}` : 
        p.source === 'query' ? `req.query.${p.name}` : 
        `req.headers.${p.name}`
      ).join(', ') || ''});
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }`;
}

/**
 * Generate controller middleware
 */
function generateControllerMiddleware(route: ComponentPlan['controllers'][0]['routes'][0]): string[] {
  const middleware = ['express.json()'];
  
  // Add authentication middleware for protected routes
  if (route.method !== 'GET' || route.path.includes('/user')) {
    middleware.push('authenticate');
  }
  
  return middleware;
}

/**
 * Generate controller validation
 */
function generateControllerValidation(route: ComponentPlan['controllers'][0]['routes'][0]): string[] {
  const validation = [];
  
  // Add validation for required parameters
  for (const param of route.parameters || []) {
    if (param.required) {
      validation.push(`validateRequired('${param.name}', ${param.source})`);
    }
  }
  
  return validation;
}

/**
 * Generate repository contracts
 */
async function generateRepositoryContracts(
  componentPlan: ComponentPlan,
  contract: FunctionSignatureContract
): Promise<void> {
  for (const repository of componentPlan.repositories) {
    const repositoryName = repository.name;
    
    // Generate repository interface
    const interfaceCode = generateRepositoryInterface(repository);
    
    // Generate repository implementation contract
    const implementation = generateRepositoryImplementation(repository, componentPlan);
    
    contract.repositories[repositoryName] = {
      implementation
    };
  }
}

/**
 * Generate repository interface
 */
function generateRepositoryInterface(repository: ComponentPlan['repositories'][0]): string {
  let interfaceCode = `export interface I${repository.name} {\n`;
  
  for (const method of repository.methods) {
    const params = method.parameters.map(p => `${p.name}: ${p.type}`).join(', ');
    const description = method.description ? ` // ${method.description}` : '';
    interfaceCode += `  ${method.name}(${params}): Promise<${method.returnType}>;${description}\n`;
  }
  
  interfaceCode += `}\n`;
  return interfaceCode;
}

/**
 * Generate repository implementation contract
 */
function generateRepositoryImplementation(
  repository: ComponentPlan['repositories'][0],
  componentPlan: ComponentPlan
): FunctionSignatureContract['repositories'][string]['implementation'] {
  const className = repository.name;
  const entity = repository.entity;
  
  // Generate method implementations
  const methods = repository.methods.map(method => {
    const signature = `${method.name}(${method.parameters.map(p => `${p.name}: ${p.type}`).join(', ')}): Promise<${method.returnType}>`;
    const implementation = generateRepositoryMethodImplementation(method, repository, componentPlan);
    const sql = generateRepositorySQL(method, repository, componentPlan);
    
    return {
      name: method.name,
      signature,
      implementation,
      sql
    };
  });
  
  return {
    className,
    entity,
    methods
  };
}

/**
 * Generate repository method implementation
 */
function generateRepositoryMethodImplementation(
  method: ComponentPlan['repositories'][0]['methods'][0],
  repository: ComponentPlan['repositories'][0],
  componentPlan: ComponentPlan
): string {
  const methodName = method.name;
  const entityName = repository.entity;
  const tableName = entityName.toLowerCase() + 's';
  
  if (methodName === 'create') {
    return `return this.db.${tableName}.create({ data: ${method.parameters[0].name} });`;
  } else if (methodName === 'findById') {
    return `return this.db.${tableName}.findUnique({ where: { id: ${method.parameters[0].name} } });`;
  } else if (methodName === 'update') {
    return `return this.db.${tableName}.update({ where: { id: ${method.parameters[0].name} }, data: ${method.parameters[1].name} });`;
  } else if (methodName === 'delete') {
    return `return this.db.${tableName}.delete({ where: { id: ${method.parameters[0].name} } });`;
  } else if (methodName === 'findByUserId') {
    return `return this.db.${tableName}.findMany({ where: { userId: ${method.parameters[0].name} } });`;
  }
  
  return `// TODO: Implement ${methodName} method`;
}

/**
 * Generate repository SQL
 */
function generateRepositorySQL(
  method: ComponentPlan['repositories'][0]['methods'][0],
  repository: ComponentPlan['repositories'][0],
  componentPlan: ComponentPlan
): string {
  const methodName = method.name;
  const entityName = repository.entity;
  const tableName = entityName.toLowerCase() + 's';
  
  if (methodName === 'create') {
    return `INSERT INTO ${tableName} (${method.parameters[0].name.split(',').join(', ')}) VALUES (?)`;
  } else if (methodName === 'findById') {
    return `SELECT * FROM ${tableName} WHERE id = ?`;
  } else if (methodName === 'update') {
    return `UPDATE ${tableName} SET ? WHERE id = ?`;
  } else if (methodName === 'delete') {
    return `DELETE FROM ${tableName} WHERE id = ?`;
  } else if (methodName === 'findByUserId') {
    return `SELECT * FROM ${tableName} WHERE userId = ?`;
  }
  
  return '';
}

/**
 * Generate index.ts contract
 */
async function generateIndexContract(
  componentPlan: ComponentPlan,
  contract: FunctionSignatureContract,
  infrastructureContext?: any
): Promise<void> {
  // Add imports for all components
  const imports: FunctionSignatureContract['index']['imports'] = [];
  
  // Add core imports
  imports.push({ type: 'config', name: 'dotenv', path: 'dotenv' });
  imports.push({ type: 'config', name: 'express', path: 'express' });
  imports.push({ type: 'config', name: 'cors', path: 'cors' });
  imports.push({ type: 'config', name: 'helmet', path: 'helmet' });
  imports.push({ type: 'config', name: 'morgan', path: 'morgan' });
  imports.push({ type: 'config', name: 'serverless', path: 'serverless-http' });
  
  // Add component imports
  for (const controller of componentPlan.controllers) {
    imports.push({ 
      type: 'controller', 
      name: controller.name, 
      path: `./controllers/${controller.name}` 
    });
  }
  
  for (const service of componentPlan.services) {
    imports.push({ 
      type: 'service', 
      name: service.name, 
      path: `./services/${service.name}` 
    });
  }
  
  for (const repository of componentPlan.repositories) {
    imports.push({ 
      type: 'repository', 
      name: repository.name, 
      path: `./repositories/${repository.name}` 
    });
  }
  
  for (const entity of componentPlan.entities) {
    imports.push({ 
      type: 'model', 
      name: entity.name, 
      path: `./models/${entity.name}` 
    });
  }
  
  // Generate configuration
  const configuration: FunctionSignatureContract['index']['configuration'] = {
    database: {
      url: 'process.env.DATABASE_URL || "postgresql://localhost:5432/notes_app"',
      name: 'process.env.DATABASE_NAME || "notes_app"',
      username: 'process.env.DATABASE_USERNAME || "postgres"',
      password: 'process.env.DATABASE_PASSWORD || "password"',
      port: 'process.env.DATABASE_PORT || "5432"',
      type: 'process.env.DATABASE_TYPE || "postgresql"'
    },
    aws: {
      region: 'process.env.AWS_REGION || "us-east-1"',
      apiGatewayUrl: 'process.env.API_GATEWAY_URL || "https://api.example.com"',
      s3BucketName: 'process.env.S3_BUCKET_NAME || "notes-storage"',
      dynamoDbTableName: 'process.env.DYNAMODB_TABLE_NAME || "notes-table"',
      redisEndpoint: 'process.env.REDIS_ENDPOINT || "redis://localhost:6379"'
    },
    application: {
      nodeEnv: 'process.env.NODE_ENV || "production"',
      port: 'process.env.PORT || "3000"',
      logLevel: 'process.env.LOG_LEVEL || "info"'
    }
  };
  
  // Generate Express setup
  const expressSetup: FunctionSignatureContract['index']['expressSetup'] = {
    middleware: [
      'express.json()',
      'cors()',
      'helmet()',
      'morgan("combined")'
    ],
    routes: componentPlan.controllers.flatMap(controller => 
      controller.routes.map(route => ({
        path: route.path,
        method: route.method,
        controller: controller.name,
        handler: route.calls
      }))
    ),
    errorHandling: [
      'Error handling middleware',
      '404 handler',
      'Global error handler'
    ]
  };
  
  // Generate Lambda setup
  const lambdaSetup: FunctionSignatureContract['index']['lambdaSetup'] = {
    handler: 'serverless(app)',
    serverlessConfig: {
      timeout: 30,
      memorySize: 256,
      environment: {
        NODE_ENV: 'production'
      }
    }
  };
  
  // Assign to contract
  contract.index = {
    imports,
    configuration,
    expressSetup,
    lambdaSetup
  };
}

/**
 * Generate database schema
 */
async function generateDatabaseSchema(
  componentPlan: ComponentPlan,
  contract: FunctionSignatureContract,
  infrastructureContext?: any
): Promise<void> {
  const databaseType = componentPlan.integration.database.type;
  
  for (const entity of componentPlan.entities) {
    const tableName = entity.name.toLowerCase() + 's';
    
    // Generate columns
    const columns = entity.properties.map(property => {
      const columnType = mapTypeToDatabaseType(property.type, databaseType);
      const nullable = !property.required;
      const primaryKey = property.name === 'id';
      
      return {
        name: property.name,
        type: columnType,
        nullable,
        primaryKey
      };
    });
    
    // Generate indexes
    const indexes = [];
    if (entity.properties.some(p => p.name === 'id')) {
      indexes.push({
        name: `idx_${tableName}_id`,
        columns: ['id'],
        unique: true
      });
    }
    
    contract.database.tables.push({
      name: tableName,
      entity: entity.name,
      columns,
      indexes
    });
  }
  
  // Generate migration files
  contract.database.migrations = generateMigrationFiles(contract.database.tables, databaseType);
}

/**
 * Map TypeScript types to database types
 */
function mapTypeToDatabaseType(typescriptType: string, databaseType: string): string {
  const typeMap: { [key: string]: { [key: string]: string } } = {
    postgresql: {
      'string': 'VARCHAR(255)',
      'number': 'INTEGER',
      'boolean': 'BOOLEAN',
      'Date': 'TIMESTAMP',
      'string | null': 'VARCHAR(255)',
      'number | null': 'INTEGER',
      'boolean | null': 'BOOLEAN'
    },
    mysql: {
      'string': 'VARCHAR(255)',
      'number': 'INT',
      'boolean': 'BOOLEAN',
      'Date': 'DATETIME',
      'string | null': 'VARCHAR(255)',
      'number | null': 'INT',
      'boolean | null': 'BOOLEAN'
    }
  };
  
  return typeMap[databaseType]?.[typescriptType] || 'TEXT';
}

/**
 * Generate migration files
 */
function generateMigrationFiles(tables: FunctionSignatureContract['database']['tables'], databaseType: string): string[] {
  const migrations = [];
  
  for (const table of tables) {
    let migration = `CREATE TABLE ${table.name} (\n`;
    
    const columns = table.columns.map(column => {
      let columnDef = `  ${column.name} ${column.type}`;
      if (!column.nullable) {
        columnDef += ' NOT NULL';
      }
      if (column.primaryKey) {
        columnDef += ' PRIMARY KEY';
      }
      return columnDef;
    });
    
    migration += columns.join(',\n');
    migration += '\n);\n';
    
    // Add indexes
    for (const index of table.indexes || []) {
      const unique = index.unique ? 'UNIQUE ' : '';
      migration += `CREATE ${unique}INDEX ${index.name} ON ${table.name} (${index.columns.join(', ')});\n`;
    }
    
    migrations.push(migration);
  }
  
  return migrations;
}

/**
 * Generate API configuration
 */
async function generateAPIConfiguration(
  componentPlan: ComponentPlan,
  contract: FunctionSignatureContract
): Promise<void> {
  // Generate routes
  for (const controller of componentPlan.controllers) {
    for (const route of controller.routes) {
      contract.api.routes.push({
        path: route.path,
        method: route.method,
        controller: controller.name,
        handler: route.calls,
        middleware: ['json', 'cors'],
        validation: route.parameters?.map(p => p.name) || []
      });
    }
  }
  
  // Generate middleware
  contract.api.middleware = [
    {
      name: 'json',
      implementation: 'express.json()'
    },
    {
      name: 'cors',
      implementation: 'cors()'
    },
    {
      name: 'authenticate',
      implementation: 'authenticateToken'
    }
  ];
}

/**
 * Generate dependencies
 */
async function generateDependencies(
  componentPlan: ComponentPlan,
  contract: FunctionSignatureContract
): Promise<void> {
  // Generate imports
  contract.dependencies.imports = {
    'src/types/index.ts': componentPlan.entities.map(e => e.name),
    'src/services/index.ts': componentPlan.services.map(s => s.name),
    'src/controllers/index.ts': componentPlan.controllers.map(c => c.name),
    'src/repositories/index.ts': componentPlan.repositories.map(r => r.name)
  };
  
  // Generate exports
  contract.dependencies.exports = {
    'src/types/index.ts': componentPlan.entities.map(e => e.name),
    'src/services/index.ts': componentPlan.services.map(s => `I${s.name}`),
    'src/controllers/index.ts': componentPlan.controllers.map(c => `I${c.name}`),
    'src/repositories/index.ts': componentPlan.repositories.map(r => `I${r.name}`)
  };
}

/**
 * Generate TypeScript interfaces from function signature contracts
 */
export function generateTypeScriptInterfaces(contract: FunctionSignatureContract): string {
  let interfaces = '';
  
  // Generate entity interfaces (only create/update inputs, no main interfaces)
  for (const [entityName, entityContract] of Object.entries(contract.entities)) {
    interfaces += entityContract.createInput + '\n';
    interfaces += entityContract.updateInput + '\n';
  }
  
  // No service interfaces - only implementations
  // No controller interfaces - only implementations  
  // No repository interfaces - only implementations
  
  return interfaces;
}

/**
 * Generate implementation contracts for code generation
 */
export function generateImplementationContracts(contract: FunctionSignatureContract): any {
  return {
    services: contract.services,
    controllers: contract.controllers,
    repositories: contract.repositories,
    database: contract.database,
    api: contract.api
  };
} 