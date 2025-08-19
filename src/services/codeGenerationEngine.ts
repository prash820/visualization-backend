import * as fs from 'fs/promises';
import * as path from 'path';
import { openai, OPENAI_MODEL, anthropic, ANTHROPIC_MODEL } from '../config/aiProvider';
import { InfrastructureContext } from '../types/infrastructure';
import { AdvancedImportResolver, MonorepoConfig } from './advancedImportResolver';

// ============================================================================
// GLOBAL SYMBOL TABLE & METHOD SIGNATURE MANAGEMENT
// ============================================================================

export interface GlobalSymbol {
  id: string;
  name: string;
  type: 'class' | 'interface' | 'function' | 'method' | 'property' | 'type' | 'enum' | 'namespace';
  filePath: string;
  layer: 'entity' | 'service' | 'controller' | 'repository' | 'model' | 'component' | 'util';
  signature?: string;
  parameters?: ParameterDefinition[];
  returnType?: string;
  visibility: 'public' | 'private' | 'protected';
  dependencies: string[];
  dependents: string[];
  description?: string;
  lastModified: Date;
}

export interface MethodSignature {
  id: string;
  name: string;
  className: string;
  layer: 'entity' | 'service' | 'controller' | 'repository';
  parameters: ParameterDefinition[];
  returnType: string;
  visibility: 'public' | 'private' | 'protected';
  filePath: string;
  dependencies: string[];
  crossLayerConsistency: boolean;
}

export interface TypeDefinition {
  id: string;
  name: string;
  type: 'interface' | 'type' | 'enum' | 'class';
  filePath: string;
  properties: PropertyDefinition[];
  methods: MethodDefinition[];
  dependencies: string[];
  usedBy: string[];
}

export interface GlobalSymbolTable {
  symbols: Map<string, GlobalSymbol>;
  methodSignatures: Map<string, MethodSignature>;
  typeDefinitions: Map<string, TypeDefinition>;
  crossFileDependencies: Map<string, string[]>;
  layerConsistency: Map<string, boolean>;
  lastUpdated: Date;
}

export class GlobalSymbolTableManager {
  private symbolTable: GlobalSymbolTable;
  private representation: UMLIntermediateRepresentation;

  constructor(representation: UMLIntermediateRepresentation) {
    this.representation = representation;
    this.symbolTable = {
      symbols: new Map(),
      methodSignatures: new Map(),
      typeDefinitions: new Map(),
      crossFileDependencies: new Map(),
      layerConsistency: new Map(),
      lastUpdated: new Date()
    };
  }

  /**
   * Initialize the global symbol table from UML representation
   */
  async initializeSymbolTable(): Promise<GlobalSymbolTable> {
    console.log('[GlobalSymbolTableManager] Initializing global symbol table...');
    
    // Extract symbols from entities (models)
    this.extractEntitySymbols();
    
    // Extract symbols from backend components
    this.extractBackendComponentSymbols();
    
    // Extract symbols from frontend components
    this.extractFrontendComponentSymbols();
    
    // Extract method signatures from UML
    this.extractMethodSignatures();
    
    // Extract type definitions from class diagrams
    this.extractTypeDefinitions();
    
    // Build cross-file dependencies
    this.buildCrossFileDependencies();
    
    // Validate layer consistency
    this.validateLayerConsistency();
    
    console.log(`[GlobalSymbolTableManager] Symbol table initialized with ${this.symbolTable.symbols.size} symbols`);
    return this.symbolTable;
  }

  /**
   * Extract symbols from entity definitions
   */
  private extractEntitySymbols(): void {
    console.log('[GlobalSymbolTableManager] Extracting entity symbols...');
    
    for (const entity of this.representation.entities) {
      // Add entity class symbol
      const entitySymbol: GlobalSymbol = {
        id: `entity_${entity.name}`,
        name: entity.name,
        type: 'class',
        filePath: `backend/src/models/${entity.name}.ts`,
        layer: 'entity',
        visibility: 'public',
        dependencies: [],
        dependents: [],
        description: `${entity.name} entity model`,
        lastModified: new Date()
      };
      
      this.symbolTable.symbols.set(entitySymbol.id, entitySymbol);
      
      // Add property symbols
      for (const property of entity.properties) {
        const propertySymbol: GlobalSymbol = {
          id: `entity_${entity.name}_${property.name}`,
          name: property.name,
          type: 'property',
          filePath: `backend/src/models/${entity.name}.ts`,
          layer: 'entity',
          visibility: property.visibility,
          dependencies: [],
          dependents: [],
          description: `${property.name} property of ${entity.name}`,
          lastModified: new Date()
        };
        
        this.symbolTable.symbols.set(propertySymbol.id, propertySymbol);
      }
      
      // Add method symbols
      for (const method of entity.methods) {
        const methodSymbol: GlobalSymbol = {
          id: `entity_${entity.name}_${method.name}`,
          name: method.name,
          type: 'method',
          filePath: `backend/src/models/${entity.name}.ts`,
          layer: 'entity',
          signature: this.buildMethodSignature(method),
          parameters: method.parameters,
          returnType: method.returnType,
          visibility: method.visibility,
          dependencies: [],
          dependents: [],
          description: `${method.name} method of ${entity.name}`,
          lastModified: new Date()
        };
        
        this.symbolTable.symbols.set(methodSymbol.id, methodSymbol);
      }
    }
  }

  /**
   * Extract symbols from backend components
   */
  private extractBackendComponentSymbols(): void {
    console.log('[GlobalSymbolTableManager] Extracting backend component symbols...');
    
    for (const component of this.representation.backendComponents) {
      // Add component class symbol
      const componentSymbol: GlobalSymbol = {
        id: `backend_${component.name}`,
        name: component.name,
        type: 'class',
        filePath: component.filePath,
        layer: component.type as any,
        visibility: 'public',
        dependencies: component.dependencies,
        dependents: [],
        description: `${component.name} ${component.type}`,
        lastModified: new Date()
      };
      
      this.symbolTable.symbols.set(componentSymbol.id, componentSymbol);
      
      // Add method symbols
      for (const method of component.methods) {
        const methodSymbol: GlobalSymbol = {
          id: `backend_${component.name}_${method.name}`,
          name: method.name,
          type: 'method',
          filePath: component.filePath,
          layer: component.type as any,
          signature: this.buildMethodSignature(method),
          parameters: method.parameters,
          returnType: method.returnType,
          visibility: method.visibility,
          dependencies: [],
          dependents: [],
          description: `${method.name} method of ${component.name}`,
          lastModified: new Date()
        };
        
        this.symbolTable.symbols.set(methodSymbol.id, methodSymbol);
      }
    }
  }

  /**
   * Extract symbols from frontend components
   */
  private extractFrontendComponentSymbols(): void {
    console.log('[GlobalSymbolTableManager] Extracting frontend component symbols...');
    
    for (const component of this.representation.frontendComponents) {
      // Add component class symbol
      const componentSymbol: GlobalSymbol = {
        id: `frontend_${component.name}`,
        name: component.name,
        type: 'class',
        filePath: component.filePath,
        layer: 'component',
        visibility: 'public',
        dependencies: component.dependencies,
        dependents: [],
        description: `${component.name} ${component.type} component`,
        lastModified: new Date()
      };
      
      this.symbolTable.symbols.set(componentSymbol.id, componentSymbol);
      
      // Add prop symbols
      for (const prop of component.props) {
        const propSymbol: GlobalSymbol = {
          id: `frontend_${component.name}_${prop.name}`,
          name: prop.name,
          type: 'property',
          filePath: component.filePath,
          layer: 'component',
          visibility: prop.visibility,
          dependencies: [],
          dependents: [],
          description: `${prop.name} prop of ${component.name}`,
          lastModified: new Date()
        };
        
        this.symbolTable.symbols.set(propSymbol.id, propSymbol);
      }
    }
  }

  /**
   * Extract method signatures from UML representation
   */
  private extractMethodSignatures(): void {
    console.log('[GlobalSymbolTableManager] Extracting method signatures from UML...');
    
    // Extract from entities (class diagrams)
    for (const entity of this.representation.entities) {
      for (const method of entity.methods) {
        const signature: MethodSignature = {
          id: `method_${entity.name}_${method.name}`,
          name: method.name,
          className: entity.name,
          layer: 'entity',
          parameters: method.parameters,
          returnType: method.returnType,
          visibility: method.visibility,
          filePath: `backend/src/models/${entity.name}.ts`,
          dependencies: this.extractMethodDependencies(method),
          crossLayerConsistency: true
        };
        
        this.symbolTable.methodSignatures.set(signature.id, signature);
        console.log(`[GlobalSymbolTableManager] Extracted method signature: ${entity.name}.${method.name}(${method.parameters.map(p => `${p.name}: ${p.type}`).join(', ')}) -> ${method.returnType}`);
      }
    }
    
    // Extract from backend components (component diagrams)
    for (const component of this.representation.backendComponents) {
      for (const method of component.methods) {
        const signature: MethodSignature = {
          id: `method_${component.name}_${method.name}`,
          name: method.name,
          className: component.name,
          layer: component.type as any,
          parameters: method.parameters,
          returnType: method.returnType,
          visibility: method.visibility,
          filePath: component.filePath,
          dependencies: this.extractMethodDependencies(method),
          crossLayerConsistency: true
        };
        
        this.symbolTable.methodSignatures.set(signature.id, signature);
        console.log(`[GlobalSymbolTableManager] Extracted method signature: ${component.name}.${method.name}(${method.parameters.map(p => `${p.name}: ${p.type}`).join(', ')}) -> ${method.returnType}`);
      }
    }
    
    // Extract from sequence flows (sequence diagrams)
    for (const flow of this.representation.sequenceFlows) {
      const methodName = flow.action.split(' ')[0]; // Extract method name from action
      const className = flow.from; // Use 'from' as the class name
      
      const existingSignature = this.symbolTable.methodSignatures.get(`method_${className}_${methodName}`);
      
      if (!existingSignature) {
        const signature: MethodSignature = {
          id: `method_${className}_${methodName}`,
          name: methodName,
          className,
          layer: 'service', // Default to service layer
          parameters: flow.parameters,
          returnType: flow.returnType,
          visibility: 'public',
          filePath: `backend/src/services/${className}.ts`,
          dependencies: this.extractMethodDependenciesFromFlow(flow),
          crossLayerConsistency: true
        };
        
        this.symbolTable.methodSignatures.set(signature.id, signature);
        console.log(`[GlobalSymbolTableManager] Extracted method signature from sequence flow: ${className}.${methodName}(${flow.parameters.map(p => `${p.name}: ${p.type}`).join(', ')}) -> ${flow.returnType}`);
      }
    }
  }

  /**
   * Extract method dependencies from method definition
   */
  private extractMethodDependencies(method: MethodDefinition): string[] {
    const dependencies: string[] = [];
    
    // Check parameter types for dependencies
    for (const param of method.parameters) {
      if (param.type !== 'string' && param.type !== 'number' && param.type !== 'boolean' && param.type !== 'any') {
        // This could be a custom type that needs to be imported
        dependencies.push(param.type);
      }
    }
    
    // Check return type for dependencies
    if (method.returnType !== 'void' && method.returnType !== 'string' && method.returnType !== 'number' && method.returnType !== 'boolean' && method.returnType !== 'any') {
      dependencies.push(method.returnType);
    }
    
    return dependencies;
  }

  /**
   * Extract method dependencies from sequence flow
   */
  private extractMethodDependenciesFromFlow(flow: SequenceFlowDefinition): string[] {
    const dependencies: string[] = [];
    
    // Check parameter types for dependencies
    for (const param of flow.parameters) {
      if (param.type !== 'string' && param.type !== 'number' && param.type !== 'boolean' && param.type !== 'any') {
        dependencies.push(param.type);
      }
    }
    
    // Check return type for dependencies
    if (flow.returnType !== 'void' && flow.returnType !== 'string' && flow.returnType !== 'number' && flow.returnType !== 'boolean' && flow.returnType !== 'any') {
      dependencies.push(flow.returnType);
    }
    
    // Add target component as dependency
    if (flow.to && flow.to !== flow.from) {
      dependencies.push(flow.to);
    }
    
    return dependencies;
  }

  /**
   * Extract type definitions from class diagrams
   */
  private extractTypeDefinitions(): void {
    console.log('[GlobalSymbolTableManager] Extracting type definitions from class diagrams...');
    
    for (const entity of this.representation.entities) {
      const typeDef: TypeDefinition = {
        id: `type_${entity.name}`,
        name: entity.name,
        type: 'interface',
        filePath: `backend/src/models/${entity.name}.ts`,
        properties: entity.properties,
        methods: entity.methods,
        dependencies: this.extractTypeDependencies(entity),
        usedBy: []
      };
      
      this.symbolTable.typeDefinitions.set(typeDef.id, typeDef);
      console.log(`[GlobalSymbolTableManager] Extracted type definition: ${entity.name} with ${entity.properties.length} properties and ${entity.methods.length} methods`);
    }
    
    // Build usage tracking
    this.buildTypeUsageTracking();
  }

  /**
   * Extract type dependencies from entity
   */
  private extractTypeDependencies(entity: EntityDefinition): string[] {
    const dependencies: string[] = [];
    
    // Check property types for dependencies
    for (const property of entity.properties) {
      if (property.type !== 'string' && property.type !== 'number' && property.type !== 'boolean' && property.type !== 'any') {
        dependencies.push(property.type);
      }
    }
    
    // Check method parameter and return types for dependencies
    for (const method of entity.methods) {
      for (const param of method.parameters) {
        if (param.type !== 'string' && param.type !== 'number' && param.type !== 'boolean' && param.type !== 'any') {
          dependencies.push(param.type);
        }
      }
      
      if (method.returnType !== 'void' && method.returnType !== 'string' && method.returnType !== 'number' && method.returnType !== 'boolean' && method.returnType !== 'any') {
        dependencies.push(method.returnType);
      }
    }
    
    // Check relationships for dependencies
    for (const relationship of entity.relationships) {
      dependencies.push(relationship.target);
    }
    
    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Build type usage tracking
   */
  private buildTypeUsageTracking(): void {
    console.log('[GlobalSymbolTableManager] Building type usage tracking...');
    
    // Track which types are used by which components
    for (const component of this.representation.backendComponents) {
      for (const method of component.methods) {
        // Check parameter types
        for (const param of method.parameters) {
          const typeDef = this.symbolTable.typeDefinitions.get(`type_${param.type}`);
          if (typeDef) {
            typeDef.usedBy.push(component.name);
          }
        }
        
        // Check return type
        const returnTypeDef = this.symbolTable.typeDefinitions.get(`type_${method.returnType}`);
        if (returnTypeDef) {
          returnTypeDef.usedBy.push(component.name);
        }
      }
    }
    
    // Track which types are used by which entities
    for (const entity of this.representation.entities) {
      for (const method of entity.methods) {
        // Check parameter types
        for (const param of method.parameters) {
          const typeDef = this.symbolTable.typeDefinitions.get(`type_${param.type}`);
          if (typeDef) {
            typeDef.usedBy.push(entity.name);
          }
        }
        
        // Check return type
        const returnTypeDef = this.symbolTable.typeDefinitions.get(`type_${method.returnType}`);
        if (returnTypeDef) {
          returnTypeDef.usedBy.push(entity.name);
        }
      }
    }
  }

  /**
   * Build cross-file dependencies
   */
  private buildCrossFileDependencies(): void {
    console.log('[GlobalSymbolTableManager] Building cross-file dependencies...');
    
    // Build dependencies from relationships
    for (const relationship of this.representation.relationships) {
      const sourceEntity = this.representation.entities.find(e => e.name === relationship.target);
      const targetEntity = this.representation.entities.find(e => e.name === relationship.target);
      
      if (sourceEntity && targetEntity) {
        const sourceFile = `backend/src/models/${sourceEntity.name}.ts`;
        const targetFile = `backend/src/models/${targetEntity.name}.ts`;
        
        if (!this.symbolTable.crossFileDependencies.has(sourceFile)) {
          this.symbolTable.crossFileDependencies.set(sourceFile, []);
        }
        
        this.symbolTable.crossFileDependencies.get(sourceFile)!.push(targetFile);
      }
    }
    
    // Build dependencies from component relationships
    for (const component of this.representation.backendComponents) {
      for (const dependency of component.dependencies) {
        const dependentComponent = this.representation.backendComponents.find(c => c.name === dependency);
        
        if (dependentComponent) {
          if (!this.symbolTable.crossFileDependencies.has(component.filePath)) {
            this.symbolTable.crossFileDependencies.set(component.filePath, []);
          }
          
          this.symbolTable.crossFileDependencies.get(component.filePath)!.push(dependentComponent.filePath);
        }
      }
    }
  }

  /**
   * Validate layer consistency
   */
  private validateLayerConsistency(): void {
    console.log('[GlobalSymbolTableManager] Validating layer consistency...');
    
    // Check entity -> service -> controller consistency
    for (const entity of this.representation.entities) {
      const serviceName = `${entity.name}Service`;
      const controllerName = `${entity.name}Controller`;
      
      const service = this.representation.backendComponents.find(c => c.name === serviceName);
      const controller = this.representation.backendComponents.find(c => c.name === controllerName);
      
      if (service && controller) {
        // Check method consistency
        for (const entityMethod of entity.methods) {
          const serviceMethod = service.methods.find(m => m.name === entityMethod.name);
          const controllerMethod = controller.methods.find(m => m.name === entityMethod.name);
          
          const isConsistent = !!(serviceMethod && controllerMethod &&
            this.compareMethodSignatures(entityMethod, serviceMethod) &&
            this.compareMethodSignatures(entityMethod, controllerMethod));
          
          this.symbolTable.layerConsistency.set(
            `${entity.name}_${entityMethod.name}`,
            isConsistent
          );
          
          if (!isConsistent) {
            console.warn(`[GlobalSymbolTableManager] Inconsistent method signature: ${entity.name}.${entityMethod.name}`);
          }
        }
      }
    }
    
    // Validate return type consistency across layers
    this.validateReturnTypeConsistency();
  }

  /**
   * Validate return type consistency across services and controllers
   */
  private validateReturnTypeConsistency(): void {
    console.log('[GlobalSymbolTableManager] Validating return type consistency...');
    
    for (const entity of this.representation.entities) {
      const serviceName = `${entity.name}Service`;
      const controllerName = `${entity.name}Controller`;
      
      const service = this.representation.backendComponents.find(c => c.name === serviceName);
      const controller = this.representation.backendComponents.find(c => c.name === controllerName);
      
      if (service && controller) {
        for (const entityMethod of entity.methods) {
          const serviceMethod = service.methods.find(m => m.name === entityMethod.name);
          const controllerMethod = controller.methods.find(m => m.name === entityMethod.name);
          
          if (serviceMethod && controllerMethod) {
            // Check return type consistency
            const entityReturnType = entityMethod.returnType;
            const serviceReturnType = serviceMethod.returnType;
            const controllerReturnType = controllerMethod.returnType;
            
            // Normalize return types for comparison
            const normalizedEntityReturn = this.normalizeReturnType(entityReturnType);
            const normalizedServiceReturn = this.normalizeReturnType(serviceReturnType);
            const normalizedControllerReturn = this.normalizeReturnType(controllerReturnType);
            
            const isReturnTypeConsistent = normalizedEntityReturn === normalizedServiceReturn && 
                                        normalizedServiceReturn === normalizedControllerReturn;
            
            if (!isReturnTypeConsistent) {
              console.warn(`[GlobalSymbolTableManager] Inconsistent return types for ${entity.name}.${entityMethod.name}:`);
              console.warn(`  Entity: ${entityReturnType}`);
              console.warn(`  Service: ${serviceReturnType}`);
              console.warn(`  Controller: ${controllerReturnType}`);
              
              // Auto-fix return type consistency
              this.fixReturnTypeConsistency(entityMethod, serviceMethod, controllerMethod);
            } else {
              console.log(`[GlobalSymbolTableManager] Return type consistent for ${entity.name}.${entityMethod.name}: ${entityReturnType}`);
            }
          }
        }
      }
    }
  }

  /**
   * Normalize return type for comparison
   */
  private normalizeReturnType(returnType: string): string {
    // Remove Promise wrapper for comparison
    if (returnType.startsWith('Promise<') && returnType.endsWith('>')) {
      return returnType.slice(8, -1); // Remove 'Promise<' and '>'
    }
    
    // Handle common type variations
    const typeMap: { [key: string]: string } = {
      'User': 'User',
      'User[]': 'User[]',
      'Array<User>': 'User[]',
      'Promise<User>': 'User',
      'Promise<User[]>': 'User[]',
      'Response': 'Response',
      'Promise<Response>': 'Response'
    };
    
    return typeMap[returnType] || returnType;
  }

  /**
   * Fix return type consistency across layers
   */
  private fixReturnTypeConsistency(entityMethod: MethodDefinition, serviceMethod: MethodDefinition, controllerMethod: MethodDefinition): void {
    // Use entity method as the source of truth
    const correctReturnType = entityMethod.returnType;
    
    // Update service method return type
    if (serviceMethod.returnType !== correctReturnType) {
      serviceMethod.returnType = correctReturnType;
      console.log(`[GlobalSymbolTableManager] Fixed service return type: ${serviceMethod.name} -> ${correctReturnType}`);
    }
    
    // Update controller method return type
    if (controllerMethod.returnType !== correctReturnType) {
      controllerMethod.returnType = correctReturnType;
      console.log(`[GlobalSymbolTableManager] Fixed controller return type: ${controllerMethod.name} -> ${correctReturnType}`);
    }
    
    return;
  }

  /**
   * Build method signature string
   */
  private buildMethodSignature(method: MethodDefinition): string {
    const params = method.parameters.map(p => `${p.name}: ${p.type}`).join(', ');
    return `${method.name}(${params}): ${method.returnType}`;
  }

  /**
   * Compare two method signatures for consistency
   */
  private compareMethodSignatures(method1: MethodDefinition, method2: MethodDefinition): boolean {
    if (method1.name !== method2.name) return false;
    if (method1.returnType !== method2.returnType) return false;
    if (method1.parameters.length !== method2.parameters.length) return false;
    
    for (let i = 0; i < method1.parameters.length; i++) {
      const param1 = method1.parameters[i];
      const param2 = method2.parameters[i];
      
      if (param1.name !== param2.name || param1.type !== param2.type) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Get symbol by name
   */
  getSymbolByName(name: string): GlobalSymbol | undefined {
    for (const symbol of this.symbolTable.symbols.values()) {
      if (symbol.name === name) {
        return symbol;
      }
    }
    return undefined;
  }

  /**
   * Get method signature by name and class
   */
  getMethodSignature(className: string, methodName: string): MethodSignature | undefined {
    const signatureId = `method_${className}_${methodName}`;
    return this.symbolTable.methodSignatures.get(signatureId);
  }

  /**
   * Get all method signatures for a class
   */
  getMethodSignaturesForClass(className: string): MethodSignature[] {
    const signatures: MethodSignature[] = [];
    
    for (const signature of this.symbolTable.methodSignatures.values()) {
      if (signature.className === className) {
        signatures.push(signature);
      }
    }
    
    return signatures;
  }

  /**
   * Get cross-file dependencies for a file
   */
  getCrossFileDependencies(filePath: string): string[] {
    return this.symbolTable.crossFileDependencies.get(filePath) || [];
  }

  /**
   * Check layer consistency for a method
   */
  isLayerConsistent(className: string, methodName: string): boolean {
    return this.symbolTable.layerConsistency.get(`${className}_${methodName}`) || false;
  }
}

// ============================================================================
// PHASE 1: PREPROCESSING - Input Aggregator Unit
// ============================================================================

export interface UMLIntermediateRepresentation {
  entities: EntityDefinition[];
  relationships: RelationshipDefinition[];
  backendComponents: BackendComponentDefinition[];
  frontendComponents: FrontendComponentDefinition[];
  sequenceFlows: SequenceFlowDefinition[];
  infrastructureContext: InfrastructureContext;
}

export interface EntityDefinition {
  name: string;
  properties: PropertyDefinition[];
  methods: MethodDefinition[];
  relationships: RelationshipDefinition[];
}

export interface PropertyDefinition {
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'protected';
  required: boolean;
  unique?: boolean;
  description?: string;
}

export interface MethodDefinition {
  name: string;
  parameters: ParameterDefinition[];
  returnType: string;
  visibility: 'public' | 'private' | 'protected';
}

export interface ParameterDefinition {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface RelationshipDefinition {
  type: 'composition' | 'aggregation' | 'association' | 'dependency' | 'realization' | 'inheritance';
  target: string;
  description?: string;
}

export interface BackendComponentDefinition {
  name: string;
  type: 'service' | 'controller' | 'model' | 'middleware' | 'util' | 'repository';
  dependencies: string[];
  methods: MethodDefinition[];
  filePath: string;
}

export interface FrontendComponentDefinition {
  name: string;
  type: 'page' | 'component' | 'hook' | 'util';
  dependencies: string[];
  props: PropertyDefinition[];
  state: PropertyDefinition[];
  filePath: string;
}

export interface SequenceFlowDefinition {
  from: string;
  to: string;
  action: string;
  parameters: ParameterDefinition[];
  returnType: string;
}

export class InputAggregatorUnit {
  async aggregateInputs(
    umlDiagrams: any,
    infrastructureContext: InfrastructureContext
  ): Promise<UMLIntermediateRepresentation> {
    console.log('[InputAggregator] Aggregating UML diagrams and infrastructure context');
    
    const representation: UMLIntermediateRepresentation = {
      entities: [],
      relationships: [],
      backendComponents: [],
      frontendComponents: [],
      sequenceFlows: [],
      infrastructureContext
    };

    // Extract entities from class diagrams
    if (umlDiagrams.backendClass) {
      representation.entities = this.extractEntitiesFromClassDiagram(umlDiagrams.backendClass);
    }

    if (umlDiagrams.frontendClass) {
      representation.entities = this.extractEntitiesFromClassDiagram(umlDiagrams.frontendClass);
    }

    // Extract relationships
    representation.relationships = this.extractRelationships(umlDiagrams.backendClass);

    // Extract backend components from component diagrams
    if (umlDiagrams.backendComponent) {
      representation.backendComponents = this.extractBackendComponents(umlDiagrams.backendComponent);
    }

    // Extract frontend components
    if (umlDiagrams.frontendComponent) {
      representation.frontendComponents = this.extractFrontendComponents(umlDiagrams.frontendComponent);
    }

    // Extract sequence flows
    if (umlDiagrams.backendSequence) {
      representation.sequenceFlows = this.extractSequenceFlows(umlDiagrams.backendSequence);
    }

    // Ensure method signature consistency across layers
    this.ensureMethodSignatureConsistency(representation);

    console.log('[InputAggregator] Extracted entities:', representation.entities.length);
    console.log('[InputAggregator] Extracted backend components:', representation.backendComponents.length);
    console.log('[InputAggregator] Extracted frontend components:', representation.frontendComponents.length);

    return representation;
  }

  private extractEntitiesFromClassDiagram(classDiagram: string): EntityDefinition[] {
    const entities: EntityDefinition[] = [];
    
    // Parse Mermaid class diagram syntax
    const lines = classDiagram.split('\n');
    let currentClass: any = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Class declaration: class ClassName
      const classMatch = trimmedLine.match(/^class\s+(\w+)/);
      if (classMatch) {
        if (currentClass) {
          entities.push(currentClass);
        }
        currentClass = {
          name: classMatch[1],
          properties: [],
          methods: [],
          relationships: []
        };
        continue;
      }
      
      // Property: +propertyName: type
      const propertyMatch = trimmedLine.match(/^([+-])\s*(\w+)\s*:\s*([^:]+)$/);
      if (propertyMatch && currentClass) {
        const [_, visibility, name, type] = propertyMatch;
        currentClass.properties.push({
          name: name.trim(),
          type: type.trim(),
          visibility: visibility === '+' ? 'public' : 'private',
          required: true
        });
        continue;
      }
      
      // Method: +methodName(param: type): returnType
      const methodMatch = trimmedLine.match(/^([+-])\s*(\w+)\s*\(([^)]*)\)\s*:\s*([^:]+)$/);
      if (methodMatch && currentClass) {
        const [_, visibility, name, params, returnType] = methodMatch;
        const parameters = this.parseMethodParameters(params);
        currentClass.methods.push({
          name: name.trim(),
          parameters,
          returnType: returnType.trim(),
          visibility: visibility === '+' ? 'public' : 'private'
        });
        continue;
      }
      
      // Relationship: ClassA --> ClassB : relationship
      const relationshipMatch = trimmedLine.match(/^(\w+)\s*([-<>]+)\s*(\w+)\s*:\s*(.+)$/);
      if (relationshipMatch && currentClass) {
        const [_, fromClass, arrow, toClass, description] = relationshipMatch;
        currentClass.relationships.push({
          type: this.parseRelationshipType(arrow),
          target: toClass.trim(),
          description: description.trim()
        });
      }
    }
    
    // Add the last class
    if (currentClass) {
      entities.push(currentClass);
    }
    
    return entities;
  }
  
  private parseMethodParameters(paramString: string): Array<{ name: string; type: string; required: boolean }> {
    if (!paramString.trim()) return [];
    
    return paramString.split(',').map(param => {
      const trimmed = param.trim();
      const colonIndex = trimmed.indexOf(':');
      
      if (colonIndex === -1) {
        return {
          name: trimmed,
          type: 'any',
          required: true
        };
      }
      
      const name = trimmed.substring(0, colonIndex).trim();
      const type = trimmed.substring(colonIndex + 1).trim();
      
      return {
        name,
        type,
        required: true
      };
    });
  }
  
  private parseRelationshipType(arrow: string): string {
    if (arrow.includes('*--')) return 'composition';
    if (arrow.includes('o--')) return 'aggregation';
    if (arrow.includes('--')) return 'association';
    if (arrow.includes('-->')) return 'dependency';
    if (arrow.includes('..>')) return 'realization';
    if (arrow.includes('--|>')) return 'inheritance';
    return 'association';
  }

  private extractRelationships(classDiagram: string): RelationshipDefinition[] {
    const relationships: RelationshipDefinition[] = [];
    
    if (!classDiagram || typeof classDiagram !== 'string') {
      return relationships;
    }

    console.log('[InputAggregator] Extracting advanced relationships from class diagram...');
    
    // Enhanced relationship extraction from class diagram
    const lines = classDiagram.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Match inheritance: ChildClass --|> ParentClass
      const inheritanceMatch = trimmedLine.match(/^(\w+)\s*--\|\>\s*(\w+)/);
      if (inheritanceMatch) {
        const [_, child, parent] = inheritanceMatch;
        relationships.push({
          type: 'inheritance',
          target: parent,
          description: `${child} inherits from ${parent}`
        });
        console.log(`[InputAggregator] Found inheritance: ${child} --|> ${parent}`);
      }
      
      // Match composition: ContainerClass *-- ContainedClass
      const compositionMatch = trimmedLine.match(/^(\w+)\s*\*--\s*(\w+)/);
      if (compositionMatch) {
        const [_, container, contained] = compositionMatch;
        relationships.push({
          type: 'composition',
          target: contained,
          description: `${container} contains ${contained} (strong ownership)`
        });
        console.log(`[InputAggregator] Found composition: ${container} *-- ${contained}`);
      }
      
      // Match aggregation: ContainerClass o-- ContainedClass
      const aggregationMatch = trimmedLine.match(/^(\w+)\s*o--\s*(\w+)/);
      if (aggregationMatch) {
        const [_, container, contained] = aggregationMatch;
        relationships.push({
          type: 'aggregation',
          target: contained,
          description: `${container} aggregates ${contained} (weak ownership)`
        });
        console.log(`[InputAggregator] Found aggregation: ${container} o-- ${contained}`);
      }
      
      // Match association: ClassA --> ClassB : relationship
      const associationMatch = trimmedLine.match(/^(\w+)\s*-->\s*(\w+)\s*:\s*(.+)$/);
      if (associationMatch) {
        const [_, from, to, description] = associationMatch;
        relationships.push({
          type: 'association',
          target: to,
          description: `${from} associates with ${to}: ${description}`
        });
        console.log(`[InputAggregator] Found association: ${from} --> ${to}: ${description}`);
      }
      
      // Match dependency: ClassA ..> ClassB
      const dependencyMatch = trimmedLine.match(/^(\w+)\s*\.\.\>\s*(\w+)/);
      if (dependencyMatch) {
        const [_, from, to] = dependencyMatch;
        relationships.push({
          type: 'dependency',
          target: to,
          description: `${from} depends on ${to}`
        });
        console.log(`[InputAggregator] Found dependency: ${from} ..> ${to}`);
      }
      
      // Match realization: ClassA ..|> InterfaceB
      const realizationMatch = trimmedLine.match(/^(\w+)\s*\.\.\|\>\s*(\w+)/);
      if (realizationMatch) {
        const [_, implementation, interfaceName] = realizationMatch;
        relationships.push({
          type: 'realization',
          target: interfaceName,
          description: `${implementation} implements ${interfaceName}`
        });
        console.log(`[InputAggregator] Found realization: ${implementation} ..|> ${interfaceName}`);
      }
    }

    console.log(`[InputAggregator] Extracted ${relationships.length} advanced relationships`);
    return relationships;
  }

  /**
   * Ensure method signature consistency across layers (entities, services, controllers)
   */
  private ensureMethodSignatureConsistency(representation: UMLIntermediateRepresentation): void {
    console.log('[InputAggregator] Ensuring method signature consistency across layers...');
    
    // Create a map of method signatures from entities
    const entityMethodSignatures = new Map<string, MethodDefinition>();
    
    for (const entity of representation.entities) {
      for (const method of entity.methods) {
        const signatureKey = `${entity.name}.${method.name}`;
        entityMethodSignatures.set(signatureKey, method);
      }
    }
    
    // Ensure service methods match entity methods
    for (const component of representation.backendComponents) {
      if (component.type === 'service') {
        const entityName = component.name.replace('Service', '');
        const entity = representation.entities.find(e => e.name === entityName);
        
        if (entity) {
          // Update service methods to match entity methods
          component.methods = entity.methods.map(method => ({
            ...method,
            visibility: 'public' as const // Service methods should be public
          }));
          
          console.log(`[InputAggregator] Synchronized ${component.name} methods with ${entityName} entity`);
        }
      }
    }
    
    // Ensure controller methods match service methods
    for (const component of representation.backendComponents) {
      if (component.type === 'controller') {
        const serviceName = component.name.replace('Controller', 'Service');
        const service = representation.backendComponents.find(c => c.name === serviceName);
        
        if (service) {
          // Update controller methods to match service methods
          component.methods = service.methods.map(method => ({
            ...method,
            visibility: 'public' as const // Controller methods should be public
          }));
          
          console.log(`[InputAggregator] Synchronized ${component.name} methods with ${serviceName} service`);
        }
      }
    }
    
    // Ensure sequence flows match method signatures
    for (const flow of representation.sequenceFlows) {
      const methodName = flow.action.split(' ')[0]; // Extract method name from action
      const component = representation.backendComponents.find(c => 
        c.name.toLowerCase().includes(flow.from.toLowerCase()) ||
        c.name.toLowerCase().includes(flow.to.toLowerCase())
      );
      
      if (component) {
        const existingMethod = component.methods.find(m => m.name === methodName);
        if (!existingMethod) {
          // Add missing method to component
          component.methods.push({
            name: methodName,
            parameters: flow.parameters,
            returnType: flow.returnType,
            visibility: 'public'
          });
          
          console.log(`[InputAggregator] Added missing method ${methodName} to ${component.name} from sequence flow`);
        }
      }
    }
    
    console.log('[InputAggregator] Method signature consistency check completed');
  }

  private extractBackendComponents(componentDiagram: string): BackendComponentDefinition[] {
    const components: BackendComponentDefinition[] = [];
    
    if (!componentDiagram || typeof componentDiagram !== 'string') {
      return components;
    }

    console.log('[InputAggregator] Parsing backend component diagram for boundaries...');
    
    // Enhanced Mermaid flowchart diagram parsing
    const lines = componentDiagram.split('\n');
    let currentSubgraph = '';
    let componentDependencies: Map<string, string[]> = new Map();
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Track subgraph context
      if (trimmedLine.startsWith('subgraph')) {
        currentSubgraph = trimmedLine.toLowerCase();
        continue;
      }
      
      if (trimmedLine === 'end') {
        currentSubgraph = '';
        continue;
      }
      
      // Match component definition: A[ComponentName]
      const compMatch = trimmedLine.match(/^(\w+)\[([^\]]+)\]/);
      if (compMatch) {
        const [_, nodeId, componentName] = compMatch;
        
        // Check if it's in the backend subgraph
        const isBackend = currentSubgraph.includes('backend') || 
                         componentName.toLowerCase().includes('controller') ||
                         componentName.toLowerCase().includes('service') ||
                         componentName.toLowerCase().includes('repository') ||
                         componentName.toLowerCase().includes('model') ||
                         componentName.toLowerCase().includes('middleware') ||
                         componentName.toLowerCase().includes('util');
        
        if (isBackend) {
          const componentType = this.determineComponentType(componentName);
          
          components.push({
            name: componentName,
            type: componentType,
            dependencies: [],
            methods: [],
            filePath: this.generateFilePath(componentType, componentName)
          });
          
          console.log(`[InputAggregator] Found backend component: ${componentName} (${componentType})`);
        }
      }
      
      // Match dependencies: A --> B
      const depMatch = trimmedLine.match(/^(\w+)\s*-->\s*(\w+)/);
      if (depMatch) {
        const [_, fromId, toId] = depMatch;
        const fromComponent = this.findComponentById(fromId, components);
        const toComponent = this.findComponentById(toId, components);
        
        if (fromComponent && toComponent) {
          if (!componentDependencies.has(fromComponent.name)) {
            componentDependencies.set(fromComponent.name, []);
          }
          componentDependencies.get(fromComponent.name)!.push(toComponent.name);
          
          console.log(`[InputAggregator] Found dependency: ${fromComponent.name} --> ${toComponent.name}`);
        }
      }
    }
    
    // Update component dependencies
    for (const component of components) {
      const deps = componentDependencies.get(component.name) || [];
      component.dependencies = deps;
    }

    console.log(`[InputAggregator] Parsed ${components.length} backend components with dependencies`);
    return components;
  }
  
  private determineComponentType(componentName: string): 'service' | 'controller' | 'model' | 'middleware' | 'util' | 'repository' {
    const name = componentName.toLowerCase();
    
    if (name.includes('controller')) return 'controller';
    if (name.includes('service')) return 'service';
    if (name.includes('repository')) return 'repository';
    if (name.includes('model')) return 'model';
    if (name.includes('middleware')) return 'middleware';
    if (name.includes('util')) return 'util';
    
    // Default based on naming patterns
    if (name.endsWith('controller')) return 'controller';
    if (name.endsWith('service')) return 'service';
    if (name.endsWith('repository')) return 'repository';
    if (name.endsWith('model')) return 'model';
    
    return 'service'; // Default fallback
  }
  
  private generateFilePath(componentType: string, componentName: string): string {
    return `backend/src/${componentType}s/${componentName}.ts`;
  }
  
  private findComponentById(nodeId: string, components: BackendComponentDefinition[]): BackendComponentDefinition | null {
    // This is a simplified lookup - in a real implementation, you'd maintain a mapping
    // between node IDs and component names from the diagram parsing
    return components.find(c => c.name.toLowerCase().includes(nodeId.toLowerCase())) || null;
  }

  private extractFrontendComponents(componentDiagram: string): FrontendComponentDefinition[] {
    const components: FrontendComponentDefinition[] = [];
    
    if (!componentDiagram || typeof componentDiagram !== 'string') {
      return components;
    }

    // Parse Mermaid flowchart diagram
    const lines = componentDiagram.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Match component definition: A[ComponentName]
      const compMatch = trimmedLine.match(/^(\w+)\[([^\]]+)\]/);
      if (compMatch) {
        const componentName = compMatch[2];
        
        // Check if it's in the frontend subgraph
        const isFrontend = trimmedLine.includes('Frontend') || 
                          componentName.toLowerCase().includes('app') ||
                          componentName.toLowerCase().includes('component') ||
                          componentName.toLowerCase().includes('form') ||
                          componentName.toLowerCase().includes('list') ||
                          componentName.toLowerCase().includes('item');
        
        if (isFrontend) {
          const componentType = componentName.toLowerCase().includes('app') ? 'page' :
                              componentName.toLowerCase().includes('form') ? 'component' :
                              componentName.toLowerCase().includes('list') ? 'component' :
                              componentName.toLowerCase().includes('item') ? 'component' :
                              'component';
          
          components.push({
            name: componentName,
            type: componentType,
            dependencies: [],
            props: [],
            state: [],
            filePath: `src/components/${componentName}.tsx`
          });
        }
      }
    }

    console.log('[InputAggregator] Parsed frontend components:', components.map(c => c.name));
    return components;
  }

  private extractSequenceFlows(sequenceDiagram: string): SequenceFlowDefinition[] {
    const flows: SequenceFlowDefinition[] = [];
    
    if (!sequenceDiagram || typeof sequenceDiagram !== 'string') {
      return flows;
    }

    console.log('[InputAggregator] Parsing sequence diagram for method flows...');
    
    // Enhanced sequence diagram parsing
    const lines = sequenceDiagram.split('\n');
    let currentFlow: any = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('%%')) {
        continue;
      }
      
      // Match participant declaration: participant A as ComponentName
      const participantMatch = trimmedLine.match(/^participant\s+(\w+)\s+as\s+(.+)$/);
      if (participantMatch) {
        // Store participant mapping for later use
        continue;
      }
      
      // Match method calls with parameters: A->>B: methodName(param: type)
      const callMatch = trimmedLine.match(/^(\w+)->>(\w+):\s*(\w+)\(([^)]*)\)/);
      if (callMatch) {
        const [_, from, to, methodName, params] = callMatch;
        
        const parameters = this.parseMethodParameters(params);
        
        // Try to extract return type from next line (response)
        let returnType = 'void';
        const nextLine = lines[lines.indexOf(line) + 1];
        if (nextLine && nextLine.includes('-->>')) {
          const returnMatch = nextLine.match(/^(\w+)-->>(\w+):\s*([^:]+)$/);
          if (returnMatch) {
            returnType = returnMatch[3].trim();
          }
        }
        
        flows.push({
          from,
          to,
          action: methodName,
          parameters,
          returnType
        });
        
        console.log(`[InputAggregator] Extracted flow: ${from}->>${to}: ${methodName}(${params}) -> ${returnType}`);
      }
      
      // Match API calls: User->>API: POST /users (userData)
      const apiCallMatch = trimmedLine.match(/^(\w+)->>(\w+):\s*(\w+)\s+([^\s]+)\s*\(([^)]*)\)/);
      if (apiCallMatch) {
        const [_, from, to, method, path, params] = apiCallMatch;
        
        const parameters = this.parseMethodParameters(params);
        
        flows.push({
          from,
          to,
          action: `${method} ${path}`,
          parameters,
          returnType: 'Response'
        });
        
        console.log(`[InputAggregator] Extracted API call: ${from}->>${to}: ${method} ${path}(${params})`);
      }
      
      // Match service method calls: Service->>Repository: findById(id)
      const serviceCallMatch = trimmedLine.match(/^(\w+)->>(\w+):\s*(\w+)\(([^)]*)\)/);
      if (serviceCallMatch && !callMatch) { // Avoid duplicate matching
        const [_, from, to, methodName, params] = serviceCallMatch;
        
        const parameters = this.parseMethodParameters(params);
        
        flows.push({
          from,
          to,
          action: methodName,
          parameters,
          returnType: 'Promise<any>'
        });
        
        console.log(`[InputAggregator] Extracted service call: ${from}->>${to}: ${methodName}(${params})`);
      }
    }

    console.log(`[InputAggregator] Extracted ${flows.length} sequence flows`);
    return flows;
  }
}

// ============================================================================
// PHASE 2: PLANNING LAYER - Task Planner Agent
// ============================================================================

export interface TaskPlan {
  backendTasks: BackendTask[];
  frontendTasks: FrontendTask[];
  commonTasks: CommonTask[];
  testTasks: TestTask[];
  buildTasks: BuildTask[];
  deploymentTasks: DeploymentTask[];
  taskDAG: Map<string, string[]>; // taskId -> dependencies
  generationOrder: string[];
}

export interface BackendTask {
  id: string;
  type: 'model' | 'service' | 'controller' | 'route' | 'middleware' | 'auth' | 'validation' | 'serverless' | 'package';
  entityName?: string;
  componentName?: string;
  dependencies: string[];
  priority: number;
  description: string;
}

export interface FrontendTask {
  id: string;
  type: 'page' | 'component' | 'hook' | 'state' | 'router' | 'api';
  componentName?: string;
  dependencies: string[];
  priority: number;
  description: string;
}

export interface CommonTask {
  id: string;
  type: 'util' | 'type' | 'constant' | 'config';
  name: string;
  dependencies: string[];
  priority: number;
  description: string;
}

export interface TestTask {
  id: string;
  type: 'unit' | 'integration' | 'e2e';
  targetComponent: string;
  dependencies: string[];
  priority: number;
  description: string;
}

export interface BuildTask {
  id: string;
  type: 'config' | 'script' | 'dependency';
  name: string;
  dependencies: string[];
  priority: number;
  description: string;
}

export interface DeploymentTask {
  id: string;
  type: 'package' | 'deploy' | 'start';
  target: string;
  dependencies: string[];
  priority: number;
  description: string;
}

export class TaskPlannerAgent {
  async createTaskPlan(representation: UMLIntermediateRepresentation): Promise<TaskPlan> {
    console.log('[TaskPlanner] Creating AI-driven comprehensive task plan');
    
    try {
      // Build context for AI analysis
      const context = this.buildAIContext(representation);
      
      // Generate AI-driven task plan
      const aiTaskPlan = await this.generateAITaskPlan(context);
      
      // Parse and structure the AI response
      const plan = this.parseAITaskPlan(aiTaskPlan, representation);
      
      // Build task DAG and determine generation order
      this.buildTaskDAG(plan);
      plan.generationOrder = this.performTopologicalSort(plan.taskDAG);
      
      return plan;
    } catch (error) {
      console.log('[TaskPlanner] AI-driven planning failed, using fallback rule-based approach');
      
      // Use fallback rule-based approach
      const plan = this.generateFallbackTaskPlan(representation);
      
      // Build task DAG and determine generation order
      this.buildTaskDAG(plan);
      plan.generationOrder = this.performTopologicalSort(plan.taskDAG);
      
      return plan;
    }
  }

  private buildAIContext(representation: UMLIntermediateRepresentation): string {
    const context = {
      entities: representation.entities.map(entity => ({
        name: entity.name,
        properties: entity.properties,
        methods: entity.methods,
        relationships: entity.relationships
      })),
      backendComponents: representation.backendComponents.map(component => ({
        name: component.name,
        type: component.type,
        dependencies: component.dependencies,
        methods: component.methods,
        filePath: component.filePath
      })),
      frontendComponents: representation.frontendComponents.map(component => ({
        name: component.name,
        type: component.type,
        dependencies: component.dependencies,
        props: component.props,
        state: component.state,
        filePath: component.filePath
      })),
      sequenceFlows: representation.sequenceFlows.map(flow => ({
        from: flow.from,
        to: flow.to,
        action: flow.action,
        parameters: flow.parameters,
        returnType: flow.returnType
      })),
      infrastructure: representation.infrastructureContext
    };

    return JSON.stringify(context, null, 2);
  }

  private async generateAITaskPlan(context: string): Promise<string> {
    const prompt = `You are an expert software architect and project planner. Analyze the following application context and generate a comprehensive task plan for building a full-stack application.

CONTEXT:
${context}

REQUIREMENTS:
1. Generate a detailed task plan that covers backend, frontend, shared, testing, build, and deployment tasks
2. Consider the infrastructure context (AWS Lambda, S3, etc.) when planning deployment tasks
3. Ensure proper task dependencies and generation order
4. Include specific file paths, class names, and method signatures
5. Consider the sequence flows to determine proper task dependencies
6. Plan for proper folder structure and naming conventions
7. Include necessary middleware, utilities, and configuration tasks

TASK PLAN STRUCTURE:
- backendTasks: Models, Services, Controllers, Routes, Middleware, Auth, Validation
- frontendTasks: Pages, Components, Hooks, State Management, Routing
- commonTasks: Shared Types, Constants, Utilities, Configuration
- testTasks: Unit, Integration, E2E tests
- buildTasks: Package configuration, Build scripts, Dependencies
- deploymentTasks: Infrastructure setup, Deployment scripts, Service startup

OUTPUT FORMAT:
Return a JSON object with the following structure:
{
  "backendTasks": [
    {
      "id": "backend_1",
      "type": "model|service|controller|route|middleware|auth|validation",
      "entityName": "EntityName" (for models),
      "componentName": "ComponentName" (for services/controllers),
      "dependencies": ["task_id1", "task_id2"],
      "priority": 1-5,
      "description": "Detailed description",
      "filePath": "backend/src/path/to/file.ts",
      "className": "ClassName",
      "methodSignatures": [
        {
          "name": "methodName",
          "parameters": [{"name": "param", "type": "string", "required": true}],
          "returnType": "string",
          "visibility": "public|private|protected"
        }
      ],
      "folderPath": "backend/src/path",
      "imports": ["dependency1", "dependency2"]
    }
  ],
  "frontendTasks": [...],
  "commonTasks": [...],
  "testTasks": [...],
  "buildTasks": [...],
  "deploymentTasks": [...],
  "folderStructure": {
    "backend": {"src": {"models": [...], "services": [...], "controllers": [...], "routes": [...], "middleware": [...], "utils": [...]}},
    "frontend": {"src": {"components": [...], "pages": [...], "hooks": [...], "utils": [...]}},
    "shared": {"src": {"types": [...], "constants": [...], "utils": [...]}}
  }
}

Focus on creating a realistic, implementable task plan that follows best practices and considers the specific requirements of the application.`;

    try {
      // Use the same AI request mechanism as other generators
      const aiResponse = await this.makeAIRequest(prompt);
      return aiResponse;
    } catch (error) {
      console.error('[TaskPlanner] AI task plan generation failed, falling back to rule-based approach:', error);
      throw error; // Re-throw to let the caller handle the fallback
    }
  }

  private async makeAIRequest(prompt: string): Promise<string> {
    // Use the same AI provider as other generators
    const { Configuration, OpenAIApi } = require('openai');
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    try {
      const response = await openai.createChatCompletion({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert software architect specializing in full-stack application development, AWS infrastructure, and TypeScript/React development.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.3,
      });

      return response.data.choices[0].message?.content || '';
    } catch (error) {
      console.error('[TaskPlanner] AI request failed:', error);
      throw error;
    }
  }

  private parseAITaskPlan(aiResponse: string, representation: UMLIntermediateRepresentation): TaskPlan {
    try {
      // Extract JSON from AI response (handle markdown code blocks)
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                       aiResponse.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, aiResponse];
      
      const jsonStr = jsonMatch[1] || aiResponse;
      const parsed = JSON.parse(jsonStr);

      return {
        backendTasks: parsed.backendTasks || [],
        frontendTasks: parsed.frontendTasks || [],
        commonTasks: parsed.commonTasks || [],
        testTasks: parsed.testTasks || [],
        buildTasks: parsed.buildTasks || [],
        deploymentTasks: parsed.deploymentTasks || [],
        taskDAG: new Map(),
        generationOrder: []
      };
    } catch (error) {
      console.error('[TaskPlanner] Failed to parse AI task plan, using fallback:', error);
      return this.generateFallbackTaskPlan(representation);
    }
  }

  private generateFallbackTaskPlan(representation: UMLIntermediateRepresentation): TaskPlan {
    console.log('[TaskPlanner] Using fallback rule-based task plan');
    
    const plan: TaskPlan = {
      backendTasks: [],
      frontendTasks: [],
      commonTasks: [],
      testTasks: [],
      buildTasks: [],
      deploymentTasks: [],
      taskDAG: new Map(),
      generationOrder: []
    };

    // Generate backend tasks
    plan.backendTasks = this.generateBackendTasks(representation);
    
    // Generate frontend tasks
    plan.frontendTasks = this.generateFrontendTasks(representation);
    
    // Generate common tasks
    plan.commonTasks = this.generateCommonTasks(representation);
    
    // Generate test tasks
    plan.testTasks = this.generateTestTasks(representation);
    
    // Generate build tasks
    plan.buildTasks = this.generateBuildTasks(representation);
    
    // Generate deployment tasks
    plan.deploymentTasks = this.generateDeploymentTasks(representation);
    
    return plan;
  }

  private generateBackendTasks(representation: UMLIntermediateRepresentation): BackendTask[] {
    const tasks: BackendTask[] = [];
    let taskId = 0;

    // Generate model tasks for each entity
    for (const entity of representation.entities) {
      tasks.push({
        id: `backend_${++taskId}`,
        type: 'model',
        entityName: entity.name,
        dependencies: [],
        priority: 1,
        description: `Generate ORM model for ${entity.name} entity`
      });
    }

    // Generate service tasks
    for (const component of representation.backendComponents) {
      if (component.type === 'service') {
        tasks.push({
          id: `backend_${++taskId}`,
          type: 'service',
          componentName: component.name,
          dependencies: component.dependencies.map(dep => `backend_${dep}`),
          priority: 2,
          description: `Generate service for ${component.name}`
        });
      }
    }

    // Generate controller tasks
    for (const component of representation.backendComponents) {
      if (component.type === 'controller') {
        tasks.push({
          id: `backend_${++taskId}`,
          type: 'controller',
          componentName: component.name,
          dependencies: [`backend_service_${component.name}`],
          priority: 3,
          description: `Generate controller for ${component.name}`
        });
      }
    }

    // Generate route tasks
    for (const component of representation.backendComponents) {
      if (component.type === 'controller') {
        tasks.push({
          id: `backend_${++taskId}`,
          type: 'route',
          componentName: component.name,
          dependencies: [`backend_controller_${component.name}`],
          priority: 4,
          description: `Generate routes for ${component.name}`
        });
      }
    }

    // Generate serverless configuration
    tasks.push({
      id: `backend_${++taskId}`,
      type: 'serverless',
      dependencies: [],
      priority: 5,
      description: 'Generate serverless.yml configuration'
    });

    return tasks;
  }

  private generateFrontendTasks(representation: UMLIntermediateRepresentation): FrontendTask[] {
    const tasks: FrontendTask[] = [];
    let taskId = 0;

    // Generate component tasks
    for (const component of representation.frontendComponents) {
      if (component.type === 'component') {
        tasks.push({
          id: `frontend_${++taskId}`,
          type: 'component',
          componentName: component.name,
          dependencies: component.dependencies.map(dep => `frontend_${dep}`),
          priority: 1,
          description: `Generate React component for ${component.name}`
        });
      }
    }

    // Generate page tasks
    for (const component of representation.frontendComponents) {
      if (component.type === 'page') {
        tasks.push({
          id: `frontend_${++taskId}`,
          type: 'page',
          componentName: component.name,
          dependencies: component.dependencies.map(dep => `frontend_${dep}`),
          priority: 2,
          description: `Generate React page for ${component.name}`
        });
      }
    }

    // Generate router task
    tasks.push({
      id: `frontend_${++taskId}`,
      type: 'router',
      dependencies: [],
      priority: 3,
      description: 'Generate React router configuration'
    });

    return tasks;
  }

  private generateCommonTasks(representation: UMLIntermediateRepresentation): CommonTask[] {
    const tasks: CommonTask[] = [];
    let taskId = 0;

    // Generate shared types
    tasks.push({
      id: `common_${++taskId}`,
      type: 'type',
      name: 'SharedTypes',
      dependencies: [],
      priority: 1,
      description: 'Generate shared TypeScript types'
    });

    // Generate constants
    tasks.push({
      id: `common_${++taskId}`,
      type: 'constant',
      name: 'Constants',
      dependencies: [],
      priority: 1,
      description: 'Generate shared constants'
    });

    // Generate utilities
    tasks.push({
      id: `common_${++taskId}`,
      type: 'util',
      name: 'Utils',
      dependencies: [],
      priority: 1,
      description: 'Generate shared utilities'
    });

    return tasks;
  }

  private generateTestTasks(representation: UMLIntermediateRepresentation): TestTask[] {
    const tasks: TestTask[] = [];
    let taskId = 0;

    // Generate unit tests for backend components
    for (const component of representation.backendComponents) {
      tasks.push({
        id: `test_${++taskId}`,
        type: 'unit',
        targetComponent: component.name,
        dependencies: [`backend_${component.name}`],
        priority: 1,
        description: `Generate unit tests for ${component.name}`
      });
    }

    // Generate integration tests
    tasks.push({
      id: `test_${++taskId}`,
      type: 'integration',
      targetComponent: 'API',
      dependencies: [],
      priority: 2,
      description: 'Generate integration tests for API endpoints'
    });

    // Generate E2E tests
    tasks.push({
      id: `test_${++taskId}`,
      type: 'e2e',
      targetComponent: 'Application',
      dependencies: [],
      priority: 3,
      description: 'Generate end-to-end tests for the application'
    });

    return tasks;
  }

  private generateBuildTasks(representation: UMLIntermediateRepresentation): BuildTask[] {
    const tasks: BuildTask[] = [];
    let taskId = 0;

    // Generate package.json for backend
    tasks.push({
      id: `build_${++taskId}`,
      type: 'config',
      name: 'BackendPackage',
      dependencies: [],
      priority: 1,
      description: 'Generate package.json for backend'
    });

    // Generate package.json for frontend
    tasks.push({
      id: `build_${++taskId}`,
      type: 'config',
      name: 'FrontendPackage',
      dependencies: [],
      priority: 1,
      description: 'Generate package.json for frontend'
    });

    // Generate build scripts
    tasks.push({
      id: `build_${++taskId}`,
      type: 'script',
      name: 'BuildScripts',
      dependencies: [],
      priority: 2,
      description: 'Generate build and deployment scripts'
    });

    return tasks;
  }

  private generateDeploymentTasks(representation: UMLIntermediateRepresentation): DeploymentTask[] {
    const tasks: DeploymentTask[] = [];
    let taskId = 0;

    // Generate deployment package
    tasks.push({
      id: `deploy_${++taskId}`,
      type: 'package',
      target: 'Backend',
      dependencies: [],
      priority: 1,
      description: 'Package backend for deployment'
    });

    // Generate deployment script
    tasks.push({
      id: `deploy_${++taskId}`,
      type: 'deploy',
      target: 'Lambda',
      dependencies: [`deploy_package_backend`],
      priority: 2,
      description: 'Deploy backend to AWS Lambda'
    });

    // Generate S3 deployment
    tasks.push({
      id: `deploy_${++taskId}`,
      type: 'deploy',
      target: 'S3',
      dependencies: [],
      priority: 2,
      description: 'Deploy frontend to AWS S3'
    });

    return tasks;
  }

  private buildTaskDAG(plan: TaskPlan): void {
    // Build dependencies for all task types
    const allTasks = [
      ...plan.backendTasks,
      ...plan.frontendTasks,
      ...plan.commonTasks,
      ...plan.testTasks,
      ...plan.buildTasks,
      ...plan.deploymentTasks
    ];

    for (const task of allTasks) {
      plan.taskDAG.set(task.id, task.dependencies || []);
    }
  }

  private performTopologicalSort(taskDAG: Map<string, string[]>): string[] {
    const visited = new Set<string>();
    const temp = new Set<string>();
    const order: string[] = [];

    const visit = (node: string): void => {
      if (temp.has(node)) {
        throw new Error(`Circular dependency detected: ${node}`);
      }
      if (visited.has(node)) {
        return;
      }

      temp.add(node);
      const dependencies = taskDAG.get(node) || [];
      
      for (const dep of dependencies) {
        visit(dep);
      }

      temp.delete(node);
      visited.add(node);
      order.push(node);
    };

    for (const node of taskDAG.keys()) {
      if (!visited.has(node)) {
        visit(node);
      }
    }

    return order;
  }
}

// ============================================================================
// PHASE 3: SPECIALIZED CODE GENERATOR UNITS
// ============================================================================

export interface CodeGeneratorContext {
  representation: UMLIntermediateRepresentation;
  taskPlan: TaskPlan;
  projectPath: string;
  semanticIndex: Map<string, string>; // symbolName -> filePath
  infrastructureContext: InfrastructureContext;
  symbolTable?: GlobalSymbolTable; // Enhanced with global symbol table
  globalSymbolTableManager?: GlobalSymbolTableManager; // Access to symbol table manager
}

export abstract class BaseCodeGenerator {
  protected context: CodeGeneratorContext;
  protected generatedFiles: Array<{ path: string; content: string }> = [];

  constructor(context: CodeGeneratorContext) {
    this.context = context;
  }

  abstract generate(task: any): Promise<string>;

  /**
   * Update the list of generated files for topological context
   */
  updateGeneratedFiles(files: Array<{ path: string; content: string }>): void {
    this.generatedFiles = files;
  }

  /**
   * Get topological context for AI prompts
   */
  protected getTopologicalContext(): string {
    if (this.generatedFiles.length === 0) {
      return "No files have been generated yet.";
    }

    const context = this.generatedFiles.map(file => {
      const fileName = file.path.split('/').pop() || '';
      const folder = file.path.split('/').slice(-2, -1)[0] || '';
      return `- ${folder}/${fileName}`;
    }).join('\n');

    return `Previously generated files (in topological order):\n${context}`;
  }

  /**
   * Get import suggestions based on generated files
   */
  protected getImportSuggestions(className: string): string {
    const suggestions = this.generatedFiles
      .filter(file => file.path.includes('.ts') || file.path.includes('.tsx'))
      .map(file => {
        const fileName = file.path.split('/').pop()?.replace('.ts', '').replace('.tsx', '') || '';
        const folder = file.path.split('/').slice(-2, -1)[0] || '';
        
        // Extract class names from content
        const classMatches = file.content.match(/export\s+(?:class|interface)\s+(\w+)/g);
        const classes = classMatches ? classMatches.map(match => match.replace(/export\s+(?:class|interface)\s+/, '')) : [];
        
        if (classes.length > 0) {
          return classes.map(cls => `import { ${cls} } from '../${folder}/${fileName}';`).join('\n');
        }
        return `import { ${fileName} } from '../${folder}/${fileName}';`;
      })
      .filter(imports => imports.length > 0)
      .join('\n');

    return suggestions || `// No import suggestions available for ${className}`;
  }

  /**
   * Get file structure context
   */
  protected getFileStructureContext(): string {
    const structure = this.generatedFiles.reduce((acc, file) => {
      const parts = file.path.split('/');
      const folder = parts.slice(0, -1).join('/');
      const fileName = parts[parts.length - 1];
      
      if (!acc[folder]) {
        acc[folder] = [];
      }
      acc[folder].push(fileName);
      return acc;
    }, {} as Record<string, string[]>);

    return Object.entries(structure)
      .map(([folder, files]) => `${folder}:\n  ${files.join('\n  ')}`)
      .join('\n');
  }

  /**
   * Extract method signatures from UML for enhanced generation
   */
  protected extractMethodSignaturesFromUML(className: string): MethodSignature[] {
    if (!this.context.globalSymbolTableManager) {
      return [];
    }

    return this.context.globalSymbolTableManager.getMethodSignaturesForClass(className);
  }

  /**
   * Get type definitions from UML for interface generation
   */
  protected getTypeDefinitionsFromUML(): TypeDefinition[] {
    if (!this.context.symbolTable) {
      return [];
    }

    return Array.from(this.context.symbolTable.typeDefinitions.values());
  }

  /**
   * Validate cross-layer consistency for a method
   */
  protected validateCrossLayerConsistency(className: string, methodName: string): boolean {
    if (!this.context.globalSymbolTableManager) {
      return true;
    }

    return this.context.globalSymbolTableManager.isLayerConsistent(className, methodName);
  }

  /**
   * Generate TypeScript interfaces from UML relationships
   */
  protected generateInterfacesFromUML(entityName: string): string {
    const entity = this.context.representation.entities.find(e => e.name === entityName);
    if (!entity) {
      return '';
    }

    let interfaces = '';

    // Generate input interface
    interfaces += `export interface ${entityName}Input {\n`;
    for (const property of entity.properties) {
      if (property.visibility === 'public') {
        const optional = property.required ? '' : '?';
        interfaces += `  ${property.name}${optional}: ${this.mapUMLTypeToTypeScript(property.type)};\n`;
      }
    }
    interfaces += '}\n\n';

    // Generate output interface
    interfaces += `export interface ${entityName}Output extends ${entityName}Input {\n`;
    interfaces += `  id: string;\n`;
    interfaces += `  createdAt: Date;\n`;
    interfaces += `  updatedAt: Date;\n`;
    interfaces += '}\n\n';

    // Generate service interface
    interfaces += `export interface I${entityName}Service {\n`;
    const methods = this.extractMethodSignaturesFromUML(entityName);
    for (const method of methods) {
      const params = method.parameters.map(p => `${p.name}: ${this.mapUMLTypeToTypeScript(p.type)}`).join(', ');
      interfaces += `  ${method.name}(${params}): ${this.mapUMLTypeToTypeScript(method.returnType)};\n`;
    }
    interfaces += '}\n\n';

    // Generate repository interface
    interfaces += `export interface I${entityName}Repository {\n`;
    interfaces += `  create(data: ${entityName}Input): Promise<${entityName}Output>;\n`;
    interfaces += `  findById(id: string): Promise<${entityName}Output | null>;\n`;
    interfaces += `  findAll(): Promise<${entityName}Output[]>;\n`;
    interfaces += `  update(id: string, data: Partial<${entityName}Input>): Promise<${entityName}Output | null>;\n`;
    interfaces += `  delete(id: string): Promise<boolean>;\n`;
    interfaces += '}\n\n';

    return interfaces;
  }

  /**
   * Map UML types to TypeScript types
   */
  protected mapUMLTypeToTypeScript(umlType: string): string {
    const typeMap: { [key: string]: string } = {
      'String': 'string',
      'string': 'string',
      'Integer': 'number',
      'int': 'number',
      'Number': 'number',
      'number': 'number',
      'Boolean': 'boolean',
      'boolean': 'boolean',
      'Date': 'Date',
      'date': 'Date',
      'DateTime': 'Date',
      'Object': 'any',
      'object': 'any',
      'Array': 'any[]',
      'List': 'any[]',
      'Map': 'Record<string, any>',
      'Set': 'Set<any>',
      'Promise': 'Promise<any>',
      'void': 'void',
      'Void': 'void'
    };

    // Handle generic types like List<User>
    if (umlType.includes('<') && umlType.includes('>')) {
      const genericMatch = umlType.match(/(\w+)<(\w+)>/);
      if (genericMatch) {
        const [, containerType, elementType] = genericMatch;
        const tsContainerType = typeMap[containerType] || containerType;
        const tsElementType = this.mapUMLTypeToTypeScript(elementType);
        return `${tsContainerType}<${tsElementType}>`;
      }
    }

    // Handle array types like User[]
    if (umlType.endsWith('[]')) {
      const baseType = umlType.slice(0, -2);
      return `${this.mapUMLTypeToTypeScript(baseType)}[]`;
    }

    return typeMap[umlType] || umlType;
  }

  /**
   * Generate type-safe method signatures
   */
  protected generateTypeSafeMethodSignature(method: MethodDefinition, className: string): string {
    const params = method.parameters.map(p => {
      const optional = p.required ? '' : '?';
      return `${p.name}${optional}: ${this.mapUMLTypeToTypeScript(p.type)}`;
    }).join(', ');

    const returnType = this.mapUMLTypeToTypeScript(method.returnType);
    return `${method.name}(${params}): ${returnType}`;
  }

  protected async makeAIRequest(prompt: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 4000
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('[BaseCodeGenerator] AI request failed:', error);
      
      // Return mock code for testing when AI is not available
      console.log('[BaseCodeGenerator] Using mock code generation');
      
      throw error;
    }
  }

  private extractEntityName(prompt: string): string {
    // Extract entity name from prompt
    const words = prompt.split(' ');
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (word.match(/^[A-Z][a-zA-Z]*$/) && !['Generate', 'Create', 'Build', 'Model', 'Service', 'Controller', 'Component', 'Repository'].includes(word)) {
        return word;
      }
    }
    return 'Entity';
  }










  protected updateSemanticIndex(symbolName: string, filePath: string): void {
    this.context.semanticIndex.set(symbolName, filePath);
  }
}

export class ModelGenerator extends BaseCodeGenerator {
  async generate(task: BackendTask): Promise<string> {
    // Handle tasks without specific entity names (like common tasks)
    if (!task.entityName) {
      const prompt = this.buildGenericModelPrompt(task);
      const code = await this.makeAIRequest(prompt);
      
      const fileName = `${task.type}.ts`;
      this.updateSemanticIndex(task.type, `shared/src/${task.type}s/${fileName}`);
      
      return this.cleanCode(code);
    }

    const entity = this.context.representation.entities.find(e => e.name === task.entityName);
    if (!entity) {
      throw new Error(`Entity ${task.entityName} not found`);
    }

    // Generate TypeScript interfaces from UML
    const interfaces = this.generateInterfacesFromUML(task.entityName);
    
    // Generate enhanced model with type-safe interfaces
    const enhancedPrompt = this.buildEnhancedModelPrompt(entity, interfaces);
    const code = await this.makeAIRequest(enhancedPrompt);
    
    this.updateSemanticIndex(entity.name, `backend/src/models/${entity.name}.ts`);
    
    return this.cleanCode(code);
  }


  private buildEnhancedModelPrompt(entity: EntityDefinition, interfaces: string): string {
    const methodSignatures = this.extractMethodSignaturesFromUML(entity.name);
    const typeDefinitions = this.getTypeDefinitionsFromUML();
    
    let prompt = `Generate a production-ready TypeScript model for ${entity.name} with the following specifications:

## Topological Context:
${this.getTopologicalContext()}

## File Structure Context:
${this.getFileStructureContext()}

## Import Suggestions:
${this.getImportSuggestions(entity.name)}

## UML Entity Definition:
- Name: ${entity.name}
- Properties: ${entity.properties.length}
- Methods: ${entity.methods.length}

## Properties:
${entity.properties.map(p => `- ${p.name}: ${p.type} (${p.visibility}, ${p.required ? 'required' : 'optional'})`).join('\n')}

## Methods:
${entity.methods.map(m => `- ${this.generateTypeSafeMethodSignature(m, entity.name)}`).join('\n')}

## Generated TypeScript Interfaces:
${interfaces}

## Method Signatures from UML:
${methodSignatures.map(m => `- ${m.name}(${m.parameters.map(p => `${p.name}: ${this.mapUMLTypeToTypeScript(p.type)}`).join(', ')}): ${this.mapUMLTypeToTypeScript(m.returnType)}`).join('\n')}

## Cross-Layer Consistency:
${entity.methods.map(m => `- ${entity.name}.${m.name}: ${this.validateCrossLayerConsistency(entity.name, m.name) ? '✅ Consistent' : '❌ Inconsistent'}`).join('\n')}

## CRITICAL REQUIREMENTS:
- Generate ONLY the TypeScript code
- NO explanations, NO comments, NO markdown formatting
- NO "To create a..." or "Below is a..." text
- NO code fences or backticks
- Start directly with the first import statement
- End with the last export statement
- Generate complete, functional code that compiles immediately
- Use proper import paths based on the file structure context
- Ensure all imports reference existing files from the topological context

Generate the complete TypeScript model code for ${entity.name}:`;
    
    return prompt;
  }

  private buildGenericModelPrompt(task: BackendTask): string {
    if (task.type === 'serverless') {
      return `
Generate a serverless.yml configuration file for AWS Lambda deployment.

Infrastructure Context:
${JSON.stringify(this.context.infrastructureContext, null, 2)}

Requirements:
1. Create serverless.yml for Lambda deployment
2. Include all necessary functions
3. Configure proper IAM roles
4. Set up environment variables
5. Configure API Gateway
6. Include proper timeout and memory settings
7. Add CORS configuration for frontend
8. Use proper AWS region and stage

## CRITICAL REQUIREMENTS:
- Generate ONLY the serverless.yml configuration
- NO explanations, NO comments, NO markdown formatting
- NO "To create a..." or "Below is a..." text
- NO code fences or backticks
- Generate complete, functional configuration that works immediately

Generate the complete serverless.yml configuration:`;
    }
    
    if (task.type === 'package') {
      return `
Generate a package.json file for the backend Lambda functions.

Infrastructure Context:
${JSON.stringify(this.context.infrastructureContext, null, 2)}

## CRITICAL REQUIREMENTS:
- Generate ONLY the package.json configuration
- NO explanations, NO comments, NO markdown formatting
- NO "To create a..." or "Below is a..." text
- NO code fences or backticks
- Generate complete, functional configuration that works immediately

Generate the complete package.json configuration:`;
    }
    
    return `
Generate a TypeScript ${task.type} file.

Task Type: ${task.type}
Task Description: ${task.description}

Infrastructure Context:
${JSON.stringify(this.context.infrastructureContext, null, 2)}

## CRITICAL REQUIREMENTS:
- Generate ONLY the TypeScript code
- NO explanations, NO comments, NO markdown formatting
- NO "To create a..." or "Below is a..." text
- NO code fences or backticks
- Start directly with the first import statement
- End with the last export statement
- Generate complete, functional code that compiles immediately

Generate the complete TypeScript ${task.type} code:`;
  }

  private buildModelPrompt(entity: EntityDefinition): string {
    return `
Generate a TypeScript ORM model for the ${entity.name} entity.

Entity Definition:
- Name: ${entity.name}
- Attributes: ${JSON.stringify(entity.properties, null, 2)}
- Methods: ${JSON.stringify(entity.methods, null, 2)}
- Relationships: ${entity.relationships.join(', ')}

Infrastructure Context:
${JSON.stringify(this.context.infrastructureContext, null, 2)}

## CRITICAL REQUIREMENTS:
- Generate ONLY the TypeScript code
- NO explanations, NO comments, NO markdown formatting
- NO "To create a..." or "Below is a..." text
- NO code fences or backticks
- Start directly with the first import statement
- End with the last export statement
- Generate complete, functional code that compiles immediately

Generate the complete TypeScript model code for ${entity.name}:`;
  }

  private cleanCode(code: string): string {
    // Remove markdown code blocks
    let cleaned = code.replace(/```typescript\n?/g, '').replace(/```ts\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Remove explanatory text before code starts
    const codeStartPatterns = [
      /^.*?(import\s+)/,
      /^.*?(export\s+)/,
      /^.*?(class\s+)/,
      /^.*?(interface\s+)/,
      /^.*?(type\s+)/,
      /^.*?(enum\s+)/,
      /^.*?(const\s+)/,
      /^.*?(let\s+)/,
      /^.*?(var\s+)/,
      /^.*?(function\s+)/
    ];
    
    for (const pattern of codeStartPatterns) {
      const match = cleaned.match(pattern);
      if (match) {
        cleaned = cleaned.substring(match.index!);
        break;
      }
    }
    
    return cleaned;
  }
}

export class ServiceGenerator extends BaseCodeGenerator {
  async generate(task: BackendTask): Promise<string> {
    const component = this.context.representation.backendComponents.find(c => c.name === task.componentName);
    if (!component) {
      throw new Error(`Component ${task.componentName} not found`);
    }

    // Extract method signatures from UML
    const methodSignatures = this.extractMethodSignaturesFromUML(component.name);
    
    // Generate type-safe interfaces
    const entityName = component.name.replace('Service', '');
    const interfaces = this.generateInterfacesFromUML(entityName);
    
    // Build enhanced service prompt
    const enhancedPrompt = this.buildEnhancedServicePrompt(component, methodSignatures, interfaces);
    const code = await this.makeAIRequest(enhancedPrompt);
    
    this.updateSemanticIndex(`${component.name}Service`, `src/services/${component.name}Service.ts`);
    
    return this.cleanCode(code);
  }

  private buildEnhancedServicePrompt(component: BackendComponentDefinition, methodSignatures: MethodSignature[], interfaces: string): string {
    const entityName = component.name.replace('Service', '');
    const entity = this.context.representation.entities.find(e => e.name === entityName);
    
    let prompt = `Generate a production-ready TypeScript service for ${component.name} with the following specifications:

## Topological Context:
${this.getTopologicalContext()}

## File Structure Context:
${this.getFileStructureContext()}

## Import Suggestions:
${this.getImportSuggestions(component.name)}

## Service Definition:
- Name: ${component.name}
- Type: ${component.type}
- Dependencies: ${component.dependencies.join(', ')}

## UML Method Signatures:
${methodSignatures.map(m => `- ${m.name}(${m.parameters.map(p => `${p.name}: ${this.mapUMLTypeToTypeScript(p.type)}`).join(', ')}): ${this.mapUMLTypeToTypeScript(m.returnType)}`).join('\n')}

## TypeScript Interfaces:
${interfaces}

## Cross-Layer Consistency Validation:
${component.methods.map(m => `- ${component.name}.${m.name}: ${this.validateCrossLayerConsistency(component.name, m.name) ? '✅ Consistent' : '❌ Inconsistent'}`).join('\n')}

## Entity Properties (if available):
${entity ? entity.properties.map(p => `- ${p.name}: ${p.type} (${p.visibility}, ${p.required ? 'required' : 'optional'})`).join('\n') : 'No entity found'}

## CRITICAL REQUIREMENTS:
- Generate ONLY the TypeScript code
- NO explanations, NO comments, NO markdown formatting
- NO "To create a..." or "Below is a..." text
- NO code fences or backticks
- Start directly with the first import statement
- End with the last export statement
- Generate complete, functional code that compiles immediately
- Use proper import paths based on the file structure context
- Ensure all imports reference existing files from the topological context

Generate the complete TypeScript service code for ${component.name}:`;
    
    return prompt;
  }

  private cleanCode(code: string): string {
    return code.replace(/```typescript\n?/g, '').replace(/```\n?/g, '').trim();
  }
}

export class ControllerGenerator extends BaseCodeGenerator {
  async generate(task: BackendTask): Promise<string> {
    // Handle tasks without specific component names (like auth, validation)
    if (!task.componentName) {
      const prompt = this.buildGenericControllerPrompt(task);
      const code = await this.makeAIRequest(prompt);
      
      const fileName = `${task.type}Controller.ts`;
      this.updateSemanticIndex(`${task.type}Controller`, `backend/src/controllers/${fileName}`);
      
      return this.cleanCode(code);
    }

    const component = this.context.representation.backendComponents.find(c => c.name === task.componentName);
    if (!component) {
      throw new Error(`Component ${task.componentName} not found`);
    }

    const prompt = this.buildControllerPrompt(component);
    const code = await this.makeAIRequest(prompt);
    
    this.updateSemanticIndex(`${component.name}Controller`, `backend/src/controllers/${component.name}Controller.ts`);
    
    return this.cleanCode(code);
  }

  private buildGenericControllerPrompt(task: BackendTask): string {
    return `
Generate a TypeScript Express ${task.type} controller.

Task Type: ${task.type}
Task Description: ${task.description}

Infrastructure Context:
${JSON.stringify(this.context.infrastructureContext, null, 2)}

Requirements:
1. Create an Express ${task.type} controller class
2. Implement appropriate ${task.type} functionality
3. Add proper request/response validation
4. Include error handling middleware
5. Add proper HTTP status codes
6. Include OpenAPI documentation
7. Follow REST API best practices

Generate only the controller code without explanations:
`;
  }

  private buildControllerPrompt(component: BackendComponentDefinition): string {
    // Extract method signatures from UML
    const methodSignatures = this.extractMethodSignaturesFromUML(component.name);
    
    // Generate type-safe interfaces
    const entityName = component.name.replace('Controller', '');
    const interfaces = this.generateInterfacesFromUML(entityName);
    
    // Get service methods for consistency validation
    const serviceName = `${entityName}Service`;
    const serviceMethodSignatures = this.extractMethodSignaturesFromUML(serviceName);
    
    let prompt = `Generate a production-ready TypeScript Express controller for ${component.name} with the following specifications:

## Topological Context:
${this.getTopologicalContext()}

## File Structure Context:
${this.getFileStructureContext()}

## Import Suggestions:
${this.getImportSuggestions(component.name)}

## Controller Definition:
- Name: ${component.name}
- Type: ${component.type}
- Dependencies: ${component.dependencies.join(', ')}

## UML Method Signatures:
${methodSignatures.map(m => `- ${m.name}(${m.parameters.map(p => `${p.name}: ${this.mapUMLTypeToTypeScript(p.type)}`).join(', ')}): ${this.mapUMLTypeToTypeScript(m.returnType)}`).join('\n')}

## TypeScript Interfaces:
${interfaces}

## Cross-Layer Consistency Validation:
${component.methods.map(m => `- ${component.name}.${m.name}: ${this.validateCrossLayerConsistency(component.name, m.name) ? '✅ Consistent' : '❌ Inconsistent'}`).join('\n')}

## Service Layer Methods (for consistency):
${serviceMethodSignatures.map(m => `- ${serviceName}.${m.name}(${m.parameters.map(p => `${p.name}: ${this.mapUMLTypeToTypeScript(p.type)}`).join(', ')}): ${this.mapUMLTypeToTypeScript(m.returnType)}`).join('\n')}

## CRITICAL REQUIREMENTS:
- Generate ONLY the TypeScript code
- NO explanations, NO comments, NO markdown formatting
- NO "To create a..." or "Below is a..." text
- NO code fences or backticks
- Start directly with the first import statement
- End with the last export statement
- Generate complete, functional code that compiles immediately
- Use proper import paths based on the file structure context
- Ensure all imports reference existing files from the topological context

Generate the complete TypeScript controller code for ${component.name}:`;
    
    return prompt;
  }

  private cleanCode(code: string): string {
    return code.replace(/```typescript\n?/g, '').replace(/```\n?/g, '').trim();
  }
}

export class FrontendComponentGenerator extends BaseCodeGenerator {
  async generate(task: FrontendTask): Promise<string> {
    // Handle tasks without specific component names (like router, api)
    if (!task.componentName) {
      const prompt = this.buildGenericComponentPrompt(task);
      const code = await this.makeAIRequest(prompt);
      
      const fileName = `${task.type}.tsx`;
      this.updateSemanticIndex(task.type, `frontend/src/components/${fileName}`);
      
      return this.cleanCode(code);
    }

    const component = this.context.representation.frontendComponents.find(c => c.name === task.componentName);
    if (!component) {
      throw new Error(`Component ${task.componentName} not found`);
    }

    const prompt = this.buildComponentPrompt(component);
    const code = await this.makeAIRequest(prompt);
    
    this.updateSemanticIndex(component.name, `frontend/src/components/${component.name}.tsx`);
    
    return this.cleanCode(code);
  }

  private buildGenericComponentPrompt(task: FrontendTask): string {
    return `
Generate a React TypeScript ${task.type} component.

Task Type: ${task.type}
Task Description: ${task.description}

Infrastructure Context:
${JSON.stringify(this.context.infrastructureContext, null, 2)}

Requirements:
1. Create a functional React ${task.type} component
2. Use TypeScript for proper typing
3. Implement appropriate ${task.type} functionality
4. Add proper error boundaries
5. Include loading states
6. Add proper accessibility attributes
7. Follow React best practices
8. Use modern React patterns (hooks, etc.)

Generate only the component code without explanations:
`;
  }

  private buildComponentPrompt(component: FrontendComponentDefinition): string {
    // Generate TypeScript interfaces for props and state
    const propInterfaces = this.generateFrontendInterfaces(component);
    
    let prompt = `Generate a production-ready React TypeScript component for ${component.name} with the following specifications:

## Component Definition:
- Name: ${component.name}
- Type: ${component.type}
- Dependencies: ${component.dependencies.join(', ')}

## Props Interface:
${component.props.map(p => `- ${p.name}: ${this.mapUMLTypeToTypeScript(p.type)} (${p.visibility}, ${p.required ? 'required' : 'optional'})`).join('\n')}

## State Interface:
${component.state.map(s => `- ${s.name}: ${this.mapUMLTypeToTypeScript(s.type)} (${s.visibility}, ${s.required ? 'required' : 'optional'})`).join('\n')}

## Generated TypeScript Interfaces:
${propInterfaces}

## Cross-Layer Consistency:
${component.props.map(p => `- ${component.name}.${p.name}: ${this.validateCrossLayerConsistency(component.name, p.name) ? '✅ Consistent' : '❌ Inconsistent'}`).join('\n')}

## CRITICAL REQUIREMENTS:
- Generate ONLY the TypeScript/React code
- NO explanations, NO comments, NO markdown formatting
- NO "To create a..." or "Below is a..." text
- NO code fences or backticks
- Start directly with the first import statement
- End with the last export statement
- Generate complete, functional code that compiles immediately

Generate the complete TypeScript/React component code for ${component.name}:`;
    
    return prompt;
  }

  private generateFrontendInterfaces(component: FrontendComponentDefinition): string {
    let interfaces = '';

    // Generate props interface
    interfaces += `export interface ${component.name}Props {\n`;
    for (const prop of component.props) {
      const optional = prop.required ? '' : '?';
      interfaces += `  ${prop.name}${optional}: ${this.mapUMLTypeToTypeScript(prop.type)};\n`;
    }
    interfaces += '}\n\n';

    // Generate state interface
    interfaces += `export interface ${component.name}State {\n`;
    for (const state of component.state) {
      const optional = state.required ? '' : '?';
      interfaces += `  ${state.name}${optional}: ${this.mapUMLTypeToTypeScript(state.type)};\n`;
    }
    interfaces += '}\n\n';

    return interfaces;
  }

  private cleanCode(code: string): string {
    return code.replace(/```typescript\n?/g, '').replace(/```\n?/g, '').trim();
  }
}

// ============================================================================
// PHASE 4: FOLDER AND FILE ORCHESTRATOR
// ============================================================================

export interface FileStructure {
  path: string;
  content: string;
  type: 'file' | 'directory';
  dependencies: string[];
}

export class StructureComposer {
  private projectPath: string;
  private fileStructure: Map<string, FileStructure>;
  private context: any; // Add context property

  constructor(projectPath: string, context?: any) {
    this.projectPath = projectPath;
    this.fileStructure = new Map();
    this.context = context;
  }

  // Getter for projectPath
  getProjectPath(): string {
    return this.projectPath;
  }

  async composeStructure(generatedFiles: Array<{ path: string; content: string }>): Promise<void> {
    console.log('[StructureComposer] Composing file structure');

    // Clean up existing files first
    await this.cleanupExistingFiles();
    
    // Create directory structure
    await this.createDirectories(generatedFiles);
    
    // Write files
    await this.writeFiles(generatedFiles);
    
    // Generate import/export statements
    await this.generateImportStatements();
    
    // Update package.json files
    await this.updatePackageFiles();
  }

  private async cleanupExistingFiles(): Promise<void> {
    console.log('[StructureComposer] Cleaning up existing files...');
    
    try {
      // Clean up backend, frontend, and shared directories
      const directories = ['backend', 'frontend', 'shared', 'src'];
      
      for (const dirName of directories) {
        const dirPath = path.join(this.projectPath, dirName);
        
        // Check if directory exists
        if (await fs.access(dirPath).then(() => true).catch(() => false)) {
          // Get all files in directory
          const files = await this.getAllFiles(dirPath);
          
          console.log(`[StructureComposer] Found ${files.length} existing files in ${dirName} to clean up`);
          
          // Delete all files except config files
          for (const file of files) {
            const relativePath = path.relative(this.projectPath, file);
            
            // Skip config files and non-source files
            if (relativePath === 'topology-and-signatures.json' || 
                relativePath.startsWith('node_modules') ||
                relativePath.startsWith('.git') ||
                relativePath.includes('package.json') ||
                relativePath.includes('package-lock.json') ||
                relativePath.includes('tsconfig.json') ||
                relativePath.includes('.env') ||
                relativePath.includes('serverless.yml') ||
                relativePath.includes('webpack.config.js')) {
              console.log(`[StructureComposer] Skipping config file: ${relativePath}`);
              continue;
            }
            
            try {
              await fs.unlink(file);
              console.log(`[StructureComposer] Deleted: ${relativePath}`);
            } catch (error) {
              console.log(`[StructureComposer] Could not delete ${relativePath}: ${error}`);
            }
          }
          
          // Remove empty directories
          await this.removeEmptyDirectories(dirPath);
        } else {
          console.log(`[StructureComposer] No ${dirName} directory found, skipping cleanup`);
        }
      }
      
      console.log('[StructureComposer] Cleanup completed');
    } catch (error) {
      console.error('[StructureComposer] Error during cleanup:', error);
    }
  }

  private async getAllFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...await this.getAllFiles(fullPath));
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.log(`[StructureComposer] Could not read directory ${dirPath}: ${error}`);
    }
    
    return files;
  }

  private async getAllTypeScriptFiles(dirPath: string): Promise<string[]> {
    const allFiles = await this.getAllFiles(dirPath);
    return allFiles.filter(file => 
      file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')
    );
  }

  private async removeEmptyDirectories(dirPath: string): Promise<void> {
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          // Recursively remove empty directories
          await this.removeEmptyDirectories(fullPath);
          
          // Check if directory is now empty
          const remainingItems = await fs.readdir(fullPath);
          if (remainingItems.length === 0) {
            await fs.rmdir(fullPath);
            console.log(`[StructureComposer] Removed empty directory: ${path.relative(this.projectPath, fullPath)}`);
          }
        }
      }
    } catch (error) {
      console.log(`[StructureComposer] Could not process directory ${dirPath}: ${error}`);
    }
  }

  private async createDirectories(files: Array<{ path: string; content: string }>): Promise<void> {
    const directories = new Set<string>();
    
    for (const file of files) {
      const dir = path.dirname(file.path);
      if (dir !== '.') {
        directories.add(dir);
      }
    }

    for (const dir of directories) {
      const fullPath = path.join(this.projectPath, dir);
      await fs.mkdir(fullPath, { recursive: true });
    }
  }

  private async writeFiles(files: Array<{ path: string; content: string }>): Promise<void> {
    console.log(`[StructureComposer] Writing ${files.length} files to disk`);
    for (const file of files) {
      const fullPath = path.join(this.projectPath, file.path);
      console.log(`[StructureComposer] Writing file: ${fullPath}`);
      await fs.writeFile(fullPath, file.content, 'utf8');
      console.log(`[StructureComposer] Successfully wrote: ${file.path}`);
    }
  }

  private async generateImportStatements(): Promise<void> {
    // Use the advanced import resolver to analyze and fix imports
    console.log('[StructureComposer] Generating import statements');
    
    try {
      // Get all TypeScript files in the project
      const tsFiles = await this.getAllTypeScriptFiles(this.projectPath);
      
      // Initialize the advanced import resolver
      const importResolver = new AdvancedImportResolver(
        this.projectPath,
        this.context.symbolTable || new Map(),
        this.createMonorepoConfig()
      );
      
      // Process all files for import resolution
      const results = await importResolver.batchProcessImports(tsFiles);
      
      // Log results
      let totalProcessed = 0;
      let totalSuccess = 0;
      results.forEach((result, filePath) => {
        totalProcessed++;
        if (result.success) {
          totalSuccess++;
          console.log(`[StructureComposer] Successfully processed imports for ${filePath}`);
          if (result.missingImports.length > 0) {
            console.log(`[StructureComposer] Added ${result.missingImports.length} missing imports`);
          }
          if (result.unusedImports.length > 0) {
            console.log(`[StructureComposer] Removed ${result.unusedImports.length} unused imports`);
          }
        } else {
          console.warn(`[StructureComposer] Failed to process imports for ${filePath}`);
        }
      });
      
      console.log(`[StructureComposer] Import processing complete: ${totalSuccess}/${totalProcessed} files processed successfully`);
      
      // Clean up
      importResolver.dispose();
      
    } catch (error) {
      console.error('[StructureComposer] Import generation failed:', error);
    }
  }
  
  private createMonorepoConfig(): MonorepoConfig {
    return {
      packages: ['backend', 'frontend', 'shared'],
      sharedTypes: ['types', 'interfaces', 'utils'],
      aliases: new Map([
        ['@/', 'src/'],
        ['@backend/', 'src/backend/'],
        ['@frontend/', 'src/frontend/'],
        ['@shared/', 'src/shared/'],
        ['@types/', 'src/types/'],
        ['@utils/', 'src/utils/']
      ]),
      basePath: this.projectPath
    };
  }

  private async updatePackageFiles(): Promise<void> {
    // Update package.json with dependencies
    console.log('[StructureComposer] Updating package files');
  }
}

// ============================================================================
// PHASE 5: VALIDATION & REFINEMENT
// ============================================================================

export interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  fixes: string[];
}

export class BuildValidatorAndFixerAgent {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  async validateAndFix(): Promise<ValidationResult> {
    console.log('[BuildValidator] Starting validation and fixing process');

    const result: ValidationResult = {
      success: false,
      errors: [],
      warnings: [],
      fixes: []
    };

    try {
      // Run TypeScript compilation
      await this.runTypeScriptCompilation(result);
      
      // Run linting
      await this.runLinting(result);
      
      // Run build process
      await this.runBuildProcess(result);
      
      // Run tests
      await this.runTests(result);
      
      result.success = result.errors.length === 0;
      
    } catch (error: any) {
      result.errors.push(error.message);
    }

    return result;
  }

  private async runTypeScriptCompilation(result: ValidationResult): Promise<void> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const { stdout, stderr } = await execAsync('npx tsc --noEmit', { cwd: this.projectPath });
      
      if (stderr) {
        result.errors.push(stderr);
      }
    } catch (error: any) {
      result.errors.push(`TypeScript compilation failed: ${error.message}`);
    }
  }

  private async runLinting(result: ValidationResult): Promise<void> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const { stdout, stderr } = await execAsync('npm run lint', { cwd: this.projectPath });
      
      if (stderr) {
        result.warnings.push(stderr);
      }
    } catch (error: any) {
      result.warnings.push(`Linting failed: ${error.message}`);
    }
  }

  private async runBuildProcess(result: ValidationResult): Promise<void> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const { stdout, stderr } = await execAsync('npm run build', { cwd: this.projectPath });
      
      if (stderr) {
        result.errors.push(stderr);
      }
    } catch (error: any) {
      result.errors.push(`Build process failed: ${error.message}`);
    }
  }

  private async runTests(result: ValidationResult): Promise<void> {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const { stdout, stderr } = await execAsync('npm test', { cwd: this.projectPath });
      
      if (stderr) {
        result.warnings.push(stderr);
      }
    } catch (error: any) {
      result.warnings.push(`Tests failed: ${error.message}`);
    }
  }
}

// ============================================================================
// PHASE 6: DEPLOYMENT TRIGGER
// ============================================================================

export class Deployer {
  private projectPath: string;
  private infrastructureContext: InfrastructureContext;

  constructor(projectPath: string, infrastructureContext: InfrastructureContext) {
    this.projectPath = projectPath;
    this.infrastructureContext = infrastructureContext;
  }

  // Getter for infrastructureContext
  getInfrastructureContext(): InfrastructureContext {
    return this.infrastructureContext;
  }

  async deploy(): Promise<{ success: boolean; deploymentUrl?: string; errors: string[] }> {
    console.log('[Deployer] Starting deployment process');

    try {
      // Package the application
      await this.packageApplication();
      
      // Deploy to infrastructure
      const deploymentUrl = await this.deployToInfrastructure();
      
      // Start services
      await this.startServices();
      
      return {
        success: true,
        deploymentUrl,
        errors: []
      };
      
    } catch (error: any) {
      return {
        success: false,
        errors: [error.message]
      };
    }
  }

  private async packageApplication(): Promise<void> {
    console.log('[Deployer] Packaging application');
    
    // Create deployment package
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    await execAsync('npm run build', { cwd: this.projectPath });
  }

  private async deployToInfrastructure(): Promise<string> {
    console.log('[Deployer] Deploying to infrastructure');
    
    // Deploy based on infrastructure context
    if (this.infrastructureContext.lambdaFunctionUrl) {
      return await this.deployToLambda();
    } else if (this.infrastructureContext.loadBalancerUrl) {
      return await this.deployToEC2();
    } else if (this.infrastructureContext.s3BucketName) {
      return await this.deployToS3();
    }
    
    // If no deployment targets found, return a mock URL for testing
    console.log('[Deployer] No deployment targets found, returning mock URL for testing');
    return 'http://localhost:3000';
  }

  private async deployToLambda(): Promise<string> {
    // Deploy to AWS Lambda
    console.log('[Deployer] Deploying to Lambda');
    return this.infrastructureContext.lambdaFunctionUrl || '';
  }

  private async deployToEC2(): Promise<string> {
    // Deploy to EC2
    console.log('[Deployer] Deploying to EC2');
    return this.infrastructureContext.loadBalancerUrl || '';
  }

  private async deployToS3(): Promise<string> {
    // Deploy to S3
    console.log('[Deployer] Deploying to S3');
    return this.infrastructureContext.cloudfrontUrl || '';
  }

  private async startServices(): Promise<void> {
    console.log('[Deployer] Starting services');
    
    // Start backend services
    if (this.infrastructureContext.lambdaFunctionUrl) {
      // Lambda auto-starts
    } else {
      // Start with PM2 or systemd
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      await execAsync('pm2 start ecosystem.config.js', { cwd: this.projectPath });
    }
  }
}

// ============================================================================
// MAIN CODE GENERATION ENGINE
// ============================================================================

export class CodeGenerationEngine {
  private inputAggregator: InputAggregatorUnit;
  private taskPlanner: TaskPlannerAgent;
  private generators: Map<string, BaseCodeGenerator>;
  private structureComposer: StructureComposer;
  private buildValidator: BuildValidatorAndFixerAgent;
  private deployer: Deployer;
  private semanticIndex: Map<string, string>;
  private globalSymbolTable: GlobalSymbolTableManager | null = null;
  private symbolTable: GlobalSymbolTable | null = null;

  constructor(projectPath: string, infrastructureContext: InfrastructureContext) {
    this.inputAggregator = new InputAggregatorUnit();
    this.taskPlanner = new TaskPlannerAgent();
    this.generators = new Map();
    this.structureComposer = new StructureComposer(projectPath, { symbolTable: this.symbolTable });
    this.buildValidator = new BuildValidatorAndFixerAgent(projectPath);
    this.deployer = new Deployer(projectPath, infrastructureContext);
    this.semanticIndex = new Map();
  }

  async generateApplication(umlDiagrams: any): Promise<{
    success: boolean;
    deploymentUrl?: string;
    errors: string[];
  }> {
    console.log('[CodeGenerationEngine] Starting application generation');

    try {
      // Phase 0: Cleanup - Remove all existing generated files
      console.log('[CodeGenerationEngine] Starting cleanup phase...');
      await this.performCleanup();
      
      // Phase 1: Preprocessing
      const representation = await this.inputAggregator.aggregateInputs(umlDiagrams, this.deployer.getInfrastructureContext());
      
      // Phase 2: Global Symbol Table Initialization
      console.log('[CodeGenerationEngine] Initializing global symbol table...');
      this.globalSymbolTable = new GlobalSymbolTableManager(representation);
      this.symbolTable = await this.globalSymbolTable.initializeSymbolTable();
      
      // Phase 3: Planning (Enhanced with Symbol Table)
      const taskPlan = await this.taskPlanner.createTaskPlan(representation);
      
      // Save task plan for reference
      await this.saveTaskPlanToFile(taskPlan, representation);
      
      // Phase 4: Code Generation (Enhanced with Symbol Table)
      const generatedFiles = await this.generateCode(taskPlan, representation);
      
      // Phase 5: Structure Composition
      await this.structureComposer.composeStructure(generatedFiles);
      
      // Phase 6: Validation & Refinement
      const validationResult = await this.buildValidator.validateAndFix();
      
      if (!validationResult.success) {
        return {
          success: false,
          errors: validationResult.errors
        };
      }
      
      // Phase 7: Deployment
      const deploymentResult = await this.deployer.deploy();
      
      return deploymentResult;
      
    } catch (error: any) {
      console.error('[CodeGenerationEngine] Error during generation:', error);
      return {
        success: false,
        errors: [error.message]
      };
    }
  }

  private async generateCode(taskPlan: TaskPlan, representation: UMLIntermediateRepresentation): Promise<Array<{ path: string; content: string }>> {
    const generatedFiles: Array<{ path: string; content: string }> = [];
    
    console.log('[CodeGenerationEngine] Starting code generation...');
    console.log('[CodeGenerationEngine] Task plan generation order:', taskPlan.generationOrder);
    console.log('[CodeGenerationEngine] Backend tasks:', taskPlan.backendTasks.length);
    console.log('[CodeGenerationEngine] Frontend tasks:', taskPlan.frontendTasks.length);
    
    const context: CodeGeneratorContext = {
      representation,
      taskPlan,
      projectPath: this.structureComposer.getProjectPath(),
      semanticIndex: this.semanticIndex,
      infrastructureContext: this.deployer.getInfrastructureContext(),
      symbolTable: this.symbolTable || undefined,
      globalSymbolTableManager: this.globalSymbolTable || undefined
    };

    // Initialize generators
    this.generators.set('model', new ModelGenerator(context));
    this.generators.set('service', new ServiceGenerator(context));
    this.generators.set('controller', new ControllerGenerator(context));
    this.generators.set('component', new FrontendComponentGenerator(context));

    // Generate code in task order
    for (const taskId of taskPlan.generationOrder) {
      const task = this.findTaskById(taskId, taskPlan);
      if (!task) {
        console.log(`[CodeGenerationEngine] Task ${taskId} not found`);
        continue;
      }

      const generator = this.getGeneratorForTask(task);
      if (!generator) {
        console.log(`[CodeGenerationEngine] No generator found for task ${taskId} (type: ${task.type})`);
        continue;
      }

      try {
        console.log(`[CodeGenerationEngine] Generating task ${taskId} (${task.type})`);
        
        // Update generator with current file context for topological awareness
        generator.updateGeneratedFiles(generatedFiles);
        
        const content = await generator.generate(task);
        const filePath = this.getFilePathForTask(task);
        
        if (content && content.trim()) {
          generatedFiles.push({
            path: filePath,
            content
          });
          
          console.log(`[CodeGenerationEngine] Generated ${filePath} (${content.length} chars, ${generatedFiles.length} files total)`);
        } else {
          console.log(`[CodeGenerationEngine] No content generated for ${taskId}`);
        }
        
      } catch (error: any) {
        console.error(`[CodeGenerationEngine] Error generating ${taskId}:`, error);
      }
    }

    console.log(`[CodeGenerationEngine] Total files generated: ${generatedFiles.length}`);
    return generatedFiles;
  }

  private findTaskById(taskId: string, taskPlan: TaskPlan): any {
    const allTasks = [
      ...taskPlan.backendTasks,
      ...taskPlan.frontendTasks,
      ...taskPlan.commonTasks,
      ...taskPlan.testTasks,
      ...taskPlan.buildTasks,
      ...taskPlan.deploymentTasks
    ];
    
    return allTasks.find(task => task.id === taskId);
  }

  private getGeneratorForTask(task: any): BaseCodeGenerator | null {
    // Map task types to generators
    const generatorMap: { [key: string]: string } = {
      'model': 'model',
      'service': 'service', 
      'controller': 'controller',
      'component': 'component',
      'auth': 'controller', // Auth can use controller generator
      'validation': 'controller', // Validation can use controller generator
      'router': 'component', // Router can use component generator
      'type': 'model', // Types can use model generator
      'constant': 'model', // Constants can use model generator
      'util': 'model', // Utils can use model generator
      'page': 'component', // Pages can use component generator
      'hook': 'component', // Hooks can use component generator
      'api': 'service', // API can use service generator
      'serverless': 'model', // Serverless config can use model generator
      'package': 'model' // Package.json can use model generator
    };
    
    const generatorType = generatorMap[task.type];
    if (generatorType) {
      return this.generators.get(generatorType) || null;
    }
    
    return null;
  }

  private async performCleanup(): Promise<void> {
    console.log('[CodeGenerationEngine] Performing comprehensive cleanup...');
    
    try {
      const projectPath = this.structureComposer.getProjectPath();
      
      // Clean up generated files and directories
      await this.cleanupGeneratedDirectories(projectPath);
      
      // Reset internal state
      this.semanticIndex.clear();
      this.generators.clear();
      
      // Reset symbol table
      this.globalSymbolTable = null;
      this.symbolTable = null;
      
      console.log('[CodeGenerationEngine] Cleanup completed successfully');
      
    } catch (error: any) {
      console.warn('[CodeGenerationEngine] Cleanup warning:', error.message);
      // Don't fail the generation if cleanup has issues
    }
  }

  private async cleanupGeneratedDirectories(projectPath: string): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');
    
    const directoriesToClean = [
      'backend/src',
      'frontend/src', 
      'shared/src',
      'backend/dist',
      'frontend/dist',
      'shared/dist'
    ];
    
    for (const dir of directoriesToClean) {
      const fullPath = path.join(projectPath, dir);
      try {
        // Check if directory exists
        const stats = await fs.stat(fullPath);
        if (stats.isDirectory()) {
          // Remove all files in the directory
          const files = await fs.readdir(fullPath);
          for (const file of files) {
            const filePath = path.join(fullPath, file);
            const fileStats = await fs.stat(filePath);
            if (fileStats.isFile()) {
              await fs.unlink(filePath);
              console.log(`[CodeGenerationEngine] Removed file: ${filePath}`);
            } else if (fileStats.isDirectory()) {
              await this.removeDirectoryRecursively(filePath);
              console.log(`[CodeGenerationEngine] Removed directory: ${filePath}`);
            }
          }
        }
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          console.warn(`[CodeGenerationEngine] Warning cleaning ${fullPath}:`, error.message);
        }
      }
    }
  }

  private async saveTaskPlanToFile(taskPlan: TaskPlan, representation: UMLIntermediateRepresentation): Promise<void> {
    console.log('[CodeGenerationEngine] Saving task plan to file for reference...');
    
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const projectPath = this.structureComposer.getProjectPath();
      const taskPlanPath = path.join(projectPath, 'task-plan.json');
      
      // Convert Map to object for JSON serialization
      const taskPlanSerializable = {
        ...taskPlan,
        taskDAG: Object.fromEntries(taskPlan.taskDAG),
        metadata: {
          generatedAt: new Date().toISOString(),
          totalTasks: taskPlan.backendTasks.length + taskPlan.frontendTasks.length + taskPlan.commonTasks.length + taskPlan.testTasks.length + taskPlan.buildTasks.length + taskPlan.deploymentTasks.length,
          backendTasks: taskPlan.backendTasks.length,
          frontendTasks: taskPlan.frontendTasks.length,
          commonTasks: taskPlan.commonTasks.length,
          testTasks: taskPlan.testTasks.length,
          buildTasks: taskPlan.buildTasks.length,
          deploymentTasks: taskPlan.deploymentTasks.length,
          generationOrder: taskPlan.generationOrder.length
        },
        representation: {
          entities: representation.entities.length,
          backendComponents: representation.backendComponents.length,
          frontendComponents: representation.frontendComponents.length,
          sequenceFlows: representation.sequenceFlows.length
        }
      };
      
      // Create detailed task plan with folder structure, class names, and method signatures
      const detailedTaskPlan = {
        summary: taskPlanSerializable,
        folderStructure: this.generateFolderStructure(representation),
        backendTasks: taskPlan.backendTasks.map(task => ({
          ...task,
          filePath: this.getFilePathForTask(task),
          estimatedComplexity: this.estimateTaskComplexity(task),
          className: this.getClassNameForTask(task, representation),
          methodSignatures: this.getMethodSignaturesForTask(task, representation),
          folderPath: this.getFolderPathForTask(task),
          imports: this.getRequiredImportsForTask(task, representation)
        })),
        frontendTasks: taskPlan.frontendTasks.map(task => ({
          ...task,
          filePath: this.getFilePathForTask(task),
          estimatedComplexity: this.estimateTaskComplexity(task),
          className: this.getClassNameForTask(task, representation),
          methodSignatures: this.getMethodSignaturesForTask(task, representation),
          folderPath: this.getFolderPathForTask(task),
          imports: this.getRequiredImportsForTask(task, representation)
        })),
        commonTasks: taskPlan.commonTasks.map(task => ({
          ...task,
          filePath: this.getFilePathForTask(task),
          estimatedComplexity: this.estimateTaskComplexity(task),
          className: this.getClassNameForTask(task, representation),
          methodSignatures: this.getMethodSignaturesForTask(task, representation),
          folderPath: this.getFolderPathForTask(task),
          imports: this.getRequiredImportsForTask(task, representation)
        })),
        testTasks: taskPlan.testTasks.map(task => ({
          ...task,
          filePath: this.getFilePathForTask(task),
          estimatedComplexity: this.estimateTaskComplexity(task),
          className: this.getClassNameForTask(task, representation),
          methodSignatures: this.getMethodSignaturesForTask(task, representation),
          folderPath: this.getFolderPathForTask(task),
          imports: this.getRequiredImportsForTask(task, representation)
        })),
        buildTasks: taskPlan.buildTasks.map(task => ({
          ...task,
          filePath: this.getFilePathForTask(task),
          estimatedComplexity: this.estimateTaskComplexity(task),
          className: this.getClassNameForTask(task, representation),
          methodSignatures: this.getMethodSignaturesForTask(task, representation),
          folderPath: this.getFolderPathForTask(task),
          imports: this.getRequiredImportsForTask(task, representation)
        })),
        deploymentTasks: taskPlan.deploymentTasks.map(task => ({
          ...task,
          filePath: this.getFilePathForTask(task),
          estimatedComplexity: this.estimateTaskComplexity(task),
          className: this.getClassNameForTask(task, representation),
          methodSignatures: this.getMethodSignaturesForTask(task, representation),
          folderPath: this.getFolderPathForTask(task),
          imports: this.getRequiredImportsForTask(task, representation)
        })),
        generationOrder: taskPlan.generationOrder.map(taskId => {
          const task = this.findTaskById(taskId, taskPlan);
          return {
            taskId,
            type: task?.type || 'unknown',
            description: task?.description || 'No description',
            filePath: task ? this.getFilePathForTask(task) : 'unknown',
            className: task ? this.getClassNameForTask(task, representation) : 'unknown',
            folderPath: task ? this.getFolderPathForTask(task) : 'unknown'
          };
        })
      };
      
      await fs.writeFile(taskPlanPath, JSON.stringify(detailedTaskPlan, null, 2));
      console.log(`[CodeGenerationEngine] Task plan saved to: ${taskPlanPath}`);
      
    } catch (error: any) {
      console.warn('[CodeGenerationEngine] Warning saving task plan:', error.message);
      // Don't fail the generation if task plan saving has issues
    }
  }

  private generateFolderStructure(representation: UMLIntermediateRepresentation): any {
    const structure = {
      backend: {
        src: {
          models: representation.entities.map(e => `${e.name}.ts`),
          services: representation.backendComponents.filter(c => c.type === 'service').map(c => {
            const serviceName = c.name.endsWith('Service') ? c.name : `${c.name}Service`;
            return `${serviceName}.ts`;
          }),
          controllers: representation.backendComponents.filter(c => c.type === 'controller').map(c => {
            const controllerName = c.name.endsWith('Controller') ? c.name : `${c.name}Controller`;
            return `${controllerName}.ts`;
          }),
          routes: representation.backendComponents.filter(c => c.type === 'controller').map(c => {
            const routeName = c.name.endsWith('Routes') ? c.name : `${c.name}Routes`;
            return `${routeName}.ts`;
          }),
          middleware: ['auth.ts', 'validation.ts', 'errorHandler.ts'],
          utils: ['database.ts', 'logger.ts', 'config.ts']
        },
        tests: ['unit', 'integration', 'e2e'],
        config: ['package.json', 'tsconfig.json', 'serverless.yml']
      },
      frontend: {
        src: {
          components: representation.frontendComponents.filter(c => c.type === 'component').map(c => `${c.name}.tsx`),
          pages: representation.frontendComponents.filter(c => c.type === 'page').map(c => {
            const pageName = c.name.endsWith('Page') ? c.name : `${c.name}Page`;
            return `${pageName}.tsx`;
          }),
          hooks: ['useApi.ts', 'useAuth.ts'],
          utils: ['api.ts', 'types.ts']
        },
        public: ['index.html', 'favicon.ico'],
        config: ['package.json', 'tsconfig.json', 'webpack.config.js']
      },
      shared: {
        src: {
          types: ['index.ts'],
          constants: ['index.ts'],
          utils: ['index.ts']
        }
      }
    };
    
    return structure;
  }

  private getClassNameForTask(task: any, representation: UMLIntermediateRepresentation): string {
    switch (task.type) {
      case 'model':
        return task.entityName || 'Model';
      case 'service':
        // Check if componentName already ends with 'Service'
        const serviceName = task.componentName || 'Service';
        return serviceName.endsWith('Service') ? serviceName : `${serviceName}Service`;
      case 'controller':
        // Check if componentName already ends with 'Controller'
        const controllerName = task.componentName || 'Controller';
        return controllerName.endsWith('Controller') ? controllerName : `${controllerName}Controller`;
      case 'component':
        return task.componentName || 'Component';
      case 'page':
        // Check if componentName already ends with 'Page'
        const pageName = task.componentName || 'Page';
        return pageName.endsWith('Page') ? pageName : `${pageName}Page`;
      case 'auth':
        return 'AuthMiddleware';
      case 'validation':
        return 'ValidationMiddleware';
      case 'route':
        // Check if componentName already ends with 'Routes'
        const routeName = task.componentName || 'Route';
        return routeName.endsWith('Routes') ? routeName : `${routeName}Routes`;
      case 'type':
        return 'SharedTypes';
      case 'constant':
        return 'Constants';
      case 'util':
        return 'Utils';
      default:
        return 'UnknownClass';
    }
  }

  private getMethodSignaturesForTask(task: any, representation: UMLIntermediateRepresentation): any[] {
    const signatures = [];
    
    switch (task.type) {
      case 'model':
        const entity = representation.entities.find(e => e.name === task.entityName);
        if (entity) {
          // Standard model methods
          signatures.push(
            { name: 'constructor', parameters: [], returnType: 'void', visibility: 'public' },
            { name: 'save', parameters: [], returnType: 'Promise<void>', visibility: 'public' },
            { name: 'delete', parameters: [], returnType: 'Promise<void>', visibility: 'public' },
            { name: 'update', parameters: [{ name: 'data', type: 'any', required: true }], returnType: 'Promise<void>', visibility: 'public' }
          );
          // Entity-specific methods
          entity.methods.forEach(method => {
            signatures.push({
              name: method.name,
              parameters: method.parameters,
              returnType: method.returnType,
              visibility: method.visibility
            });
          });
        }
        break;
        
      case 'service':
        const service = representation.backendComponents.find(c => c.name === task.componentName && c.type === 'service');
        if (service) {
          service.methods.forEach(method => {
            signatures.push({
              name: method.name,
              parameters: method.parameters,
              returnType: method.returnType,
              visibility: method.visibility
            });
          });
        }
        break;
        
      case 'controller':
        const controller = representation.backendComponents.find(c => c.name === task.componentName && c.type === 'controller');
        if (controller) {
          controller.methods.forEach(method => {
            signatures.push({
              name: method.name,
              parameters: method.parameters,
              returnType: method.returnType,
              visibility: method.visibility
            });
          });
        }
        break;
        
      case 'component':
        const component = representation.frontendComponents.find(c => c.name === task.componentName);
        if (component) {
          signatures.push(
            { name: 'render', parameters: [], returnType: 'JSX.Element', visibility: 'public' },
            { name: 'componentDidMount', parameters: [], returnType: 'void', visibility: 'public' },
            { name: 'componentWillUnmount', parameters: [], returnType: 'void', visibility: 'public' }
          );
        }
        break;
    }
    
    return signatures;
  }

  private getFolderPathForTask(task: any): string {
    switch (task.type) {
      case 'model':
        return 'backend/src/models';
      case 'service':
        return 'backend/src/services';
      case 'controller':
        return 'backend/src/controllers';
      case 'route':
        return 'backend/src/routes';
      case 'auth':
      case 'validation':
        return 'backend/src/middleware';
      case 'component':
        return 'frontend/src/components';
      case 'page':
        return 'frontend/src/pages';
      case 'router':
        return 'frontend/src/routers';
      case 'type':
        return 'shared/src/types';
      case 'constant':
        return 'shared/src/constants';
      case 'util':
        return 'shared/src/utils';
      case 'unit':
        return 'backend/src/units';
      case 'integration':
        return 'backend/src/integrations';
      case 'e2e':
        return 'backend/src/e2es';
      case 'config':
        return 'shared/src/configs';
      case 'dependency':
        return 'shared/src/dependencys';
      case 'package':
        return 'backend';
      case 'deploy':
        return 'backend/src/deploys';
      default:
        return 'unknown';
    }
  }

  private getRequiredImportsForTask(task: any, representation: UMLIntermediateRepresentation): string[] {
    const imports = [];
    
    switch (task.type) {
      case 'model':
        imports.push('mongoose', 'express');
        break;
      case 'service':
        imports.push('express', '../models/' + (task.componentName || 'Model'));
        break;
      case 'controller':
        imports.push('express', '../services/' + (task.componentName || 'Service') + 'Service');
        break;
      case 'route':
        imports.push('express', '../controllers/' + (task.componentName || 'Controller') + 'Controller');
        break;
      case 'component':
        imports.push('react', 'react-dom');
        break;
      case 'page':
        imports.push('react', '../components/' + (task.componentName || 'Component'));
        break;
      case 'auth':
        imports.push('express', 'jsonwebtoken');
        break;
      case 'validation':
        imports.push('express', 'joi');
        break;
    }
    
    return imports;
  }

  private estimateTaskComplexity(task: any): 'low' | 'medium' | 'high' {
    // Simple complexity estimation based on task type and dependencies
    if (task.dependencies.length > 3) return 'high';
    if (task.dependencies.length > 1) return 'medium';
    return 'low';
  }

  private async removeDirectoryRecursively(dirPath: string): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const files = await fs.readdir(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory()) {
          await this.removeDirectoryRecursively(filePath);
        } else {
          await fs.unlink(filePath);
        }
      }
      await fs.rmdir(dirPath);
    } catch (error: any) {
      console.warn(`[CodeGenerationEngine] Warning removing directory ${dirPath}:`, error.message);
    }
  }

  private getFilePathForTask(task: any): string {
    // Backend files (Lambda)
    if (task.type === 'model') {
      return task.entityName ? `backend/src/models/${task.entityName}.ts` : `backend/src/models/${task.type}.ts`;
    }
    if (task.type === 'service') {
      const serviceName = task.componentName || 'Service';
      const fileName = serviceName.endsWith('Service') ? serviceName : `${serviceName}Service`;
      return `backend/src/services/${fileName}.ts`;
    }
    if (task.type === 'controller') {
      const controllerName = task.componentName || 'Controller';
      const fileName = controllerName.endsWith('Controller') ? controllerName : `${controllerName}Controller`;
      return `backend/src/controllers/${fileName}.ts`;
    }
    if (task.type === 'route') {
      const routeName = task.componentName || 'Route';
      const fileName = routeName.endsWith('Routes') ? routeName : `${routeName}Routes`;
      return `backend/src/routes/${fileName}.ts`;
    }
    if (task.type === 'auth' || task.type === 'validation' || task.type === 'middleware') {
      return `backend/src/${task.type}s/${task.type}.ts`;
    }
    if (task.type === 'serverless') {
      return `backend/serverless.yml`;
    }
    if (task.type === 'package') {
      return `backend/package.json`;
    }
    
    // Frontend files (S3)
    if (task.type === 'component') {
      return task.componentName ? `frontend/src/components/${task.componentName}.tsx` : `frontend/src/components/${task.type}.tsx`;
    }
    if (task.type === 'page') {
      const pageName = task.componentName || 'Page';
      const fileName = pageName.endsWith('Page') ? pageName : `${pageName}Page`;
      return `frontend/src/pages/${fileName}.tsx`;
    }
    if (task.type === 'router') {
      return `frontend/src/routers/${task.type}.ts`;
    }
    
    // Shared files
    if (task.type === 'type' || task.type === 'constant' || task.type === 'util') {
      return `shared/src/${task.type}s/${task.type}.ts`;
    }
    
    // Handle generic tasks without specific names
    if (task.componentName) {
      return `backend/src/${task.type}s/${task.componentName}.ts`;
    }
    if (task.name) {
      return `shared/src/${task.type}s/${task.name}.ts`;
    }
    
    return `backend/src/${task.type}s/${task.type}.ts`;
  }
}