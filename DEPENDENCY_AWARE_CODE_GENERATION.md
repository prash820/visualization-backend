# Dependency-Aware Code Generation System

## Overview

The enhanced code generation system now implements a sophisticated dependency-aware approach that ensures all generated code compiles successfully with proper import statements and minimal compilation errors. This system generates files from **leaf nodes to root nodes**, ensuring all dependencies are available when needed.

## Key Features

### 1. Topological Dependency Analysis

The system analyzes component dependencies and creates a proper generation order using topological sorting:

```typescript
interface ComponentDependency {
  name: string;
  type: 'frontend' | 'backend' | 'shared';
  category: string;
  dependencies: string[];
  dependents: string[];
  complexity: number;
  generationOrder: number;
  filePath: string;
  content?: string;
}
```

**Benefits:**
- Components are generated in dependency order
- Import statements reference already-generated code
- Reduces compilation errors significantly
- Handles circular dependencies gracefully

### 2. Leaf-to-Root Generation

Components are generated sequentially in topological order, with each component receiving:

- **Dependency Context**: Already generated dependencies with their code
- **Import Context**: Proper import statements for dependencies
- **Type Information**: TypeScript interfaces from shared dependencies

**Example Generation Flow:**
1. Generate shared types first (ButtonTypes, FormTypes)
2. Generate utility functions
3. Generate models and services
4. Generate controllers and components
5. Generate pages and integration code

### 3. AI-Enhanced Import Fixing

The system uses AI to enhance existing code with proper imports:

```typescript
// Before enhancement
export const Button: React.FC<ButtonProps> = ({ children, onClick }) => {
  return <button onClick={onClick}>{children}</button>;
};

// After enhancement with dependency context
import React from 'react';
import { ButtonProps } from '../types/ButtonTypes';

export const Button: React.FC<ButtonProps> = ({ children, onClick }) => {
  return <button onClick={onClick}>{children}</button>;
};
```

## Architecture

### Dependency Graph Construction

```typescript
function analyzeComponentDependencies(codePlan: any): DependencyGraph {
  const graph: DependencyGraph = {
    components: new Map(),
    sortedOrder: [],
    cycles: []
  };
  
  // Initialize component nodes from file structure
  codePlan.fileStructure?.frontend?.forEach(file => {
    addComponentToGraph(file, 'frontend');
  });
  
  // Build dependency relationships
  buildDependencyRelationships(codePlan);
  
  return graph;
}
```

### Topological Sorting

```typescript
function performTopologicalSort(): void {
  const visited = new Set<string>();
  const tempVisited = new Set<string>();
  const sorted: string[] = [];
  const cycles: string[][] = [];
  
  const visit = (nodeName: string, path: string[] = []): boolean => {
    if (tempVisited.has(nodeName)) {
      // Circular dependency detected
      const cycle = [...path, nodeName];
      cycles.push(cycle);
      return false;
    }
    
    if (visited.has(nodeName)) {
      return true;
    }
    
    tempVisited.add(nodeName);
    
    const component = this.dependencyGraph.components.get(nodeName);
    if (component) {
      for (const dep of component.dependencies) {
        if (!visit(dep, [...path, nodeName])) {
          return false;
        }
      }
    }
    
    tempVisited.delete(nodeName);
    visited.add(nodeName);
    sorted.push(nodeName);
    
    return true;
  };
  
  // Visit all components
  for (const [name] of this.dependencyGraph.components) {
    if (!visited.has(name)) {
      visit(name);
    }
  }
  
  // Assign generation order
  sorted.forEach((name, index) => {
    const component = this.dependencyGraph.components.get(name);
    if (component) {
      component.generationOrder = index;
    }
  });
}
```

### Dependency-Aware Generation

```typescript
async function generateFilesInOrder(): Promise<GeneratedFile[]> {
  const sortedComponents = Array.from(this.dependencyGraph.components.values())
    .sort((a, b) => a.generationOrder - b.generationOrder);
  
  for (const component of sortedComponents) {
    // Get dependency context
    const dependencyContext = this.buildDependencyContext(component);
    
    // Generate or enhance component content
    const generatedFile = await this.generateComponentWithContext(component, dependencyContext);
    
    // Write file to disk
    await this.writeFileToDisk(generatedFile);
  }
}
```

## Code Generation Pipeline

### Phase 1: Analysis
- Analyze UML diagrams and extract components
- Detect application type and requirements
- Identify component relationships

### Phase 2: Dependency Analysis
- Build dependency graph from CodePlan
- Extract explicit dependencies from file structure
- Detect implicit dependencies from import statements
- Perform topological sort to determine generation order

### Phase 3: Leaf-to-Root Generation
- Generate components in dependency order
- Pass generated code context to AI
- Ensure proper import statements
- Handle circular dependencies gracefully

### Phase 4: Build Files
- Generate package.json files
- Create TypeScript configurations
- Set up environment variables
- Configure path mappings

### Phase 5: Integration
- Generate integration code
- Set up API communication
- Configure CORS and middleware
- Create deployment configurations

### Phase 6: Assembly
- Combine all generated components
- Merge integration code
- Add documentation

### Phase 7: AI Validation
- Validate generated code structure
- Apply AI-powered fixes
- Ensure code quality

### Phase 8: Recursive Error Fixing
- Detect compilation errors
- Use AI to fix errors iteratively
- Track progress and success rate
- Handle edge cases gracefully

### Phase 9: Post-Validation
- Final code quality check
- Ensure all components are usable
- Validate build configuration

## Integration with Main Pipeline

The dependency-aware generator is integrated into the main code generation pipeline:

```typescript
// In appCodeController.ts
async function processCodeGenerationJob(jobId: string, prompt: string, projectId: string, umlDiagrams: any) {
  // ... existing code ...
  
  // === Use Dependency-Aware Code Generation ===
  addCodeGenerationLog(jobId, 'Starting dependency-aware code generation...');
  try {
    const dependencyGenerator = new DependencyAwareCodeGenerator(projectPath, jobId);
    const generationResult = await dependencyGenerator.generateCodeWithDependencies(codePlan);
    
    if (generationResult.success) {
      addCodeGenerationLog(jobId, `✅ Dependency-aware generation completed successfully!`);
      addCodeGenerationLog(jobId, `📄 Generated ${generationResult.generatedFiles.length} files in dependency order`);
    } else {
      // Fallback to original sequential generation
      addCodeGenerationLog(jobId, 'Falling back to sequential generation...');
      await fallbackSequentialGeneration(codePlan, projectPath, jobId);
    }
  } catch (error: any) {
    addCodeGenerationLog(jobId, `❌ Error in dependency-aware generation: ${error.message}`);
    await fallbackSequentialGeneration(codePlan, projectPath, jobId);
  }
  
  // ... continue with build files and validation ...
}
```

## Benefits

### 1. Reduced Compilation Errors
- Components generated in dependency order
- Import statements reference existing code
- TypeScript types available when needed
- Proper file structure maintained

### 2. Better Code Quality
- AI receives context about dependencies
- Consistent coding patterns
- Proper TypeScript usage
- Modern React/Node.js patterns

### 3. Faster Development
- Build files generated automatically
- Environment configuration ready
- Deployment configuration included
- Documentation generated

### 4. Agentic Error Fixing
- Automatic error detection
- AI-powered fixes
- Multiple iteration attempts
- Progress tracking
- Graceful fallbacks

## Usage Example

```typescript
// The system automatically:
// 1. Analyzes dependencies
// 2. Generates components in order
// 3. Creates build files
// 4. Fixes compilation errors
// 5. Returns deployable code

const result = await generateApplicationCode({
  prompt: "Build a task management app",
  projectId: "task-app-123",
  umlDiagrams: { /* UML diagrams */ }
});

// Result includes:
// - Generated code with proper imports
// - Build configuration files
// - Error fixing report
```

## Testing

### Dependency Analysis Test

```bash
# Test dependency analysis without AI
node test-dependency-analysis-only.js
```

**Expected Output:**
```
🧪 Testing Dependency Analysis and Topological Sorting...
📊 Analysis Results:
📄 Total Components: 6
🔄 Sorted Order: 6 components
🔄 Circular Dependencies: 0

🔄 Generation Order:
  1. ButtonTypes (frontend/types)
  2. Button (frontend/components)
  3. FormTypes (frontend/types)
  4. Form (frontend/components)
  5. User (backend/models)
  6. UserService (backend/services)

🎯 Summary:
✅ Dependency analysis completed successfully!
   - No circular dependencies detected
   - Files can be generated in dependency order
```

### Full Generation Test

```bash
# Test full dependency-aware generation (requires AI keys)
node test-dependency-aware-generation.js
```

## Configuration

### Environment Variables

```bash
# Required for AI-powered enhancement
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

### Fallback Behavior

If dependency-aware generation fails, the system automatically falls back to the original sequential generation approach, ensuring robustness.

## Future Enhancements

1. **Parallel Generation**: Generate independent components in parallel
2. **Incremental Updates**: Only regenerate changed components and their dependents
3. **Dependency Caching**: Cache dependency analysis for faster subsequent runs
4. **Advanced Cycle Detection**: Better handling of complex circular dependencies
5. **Multi-Language Support**: Extend to other programming languages

## Troubleshooting

### Common Issues

1. **Circular Dependencies**: The system detects and reports circular dependencies
2. **Missing AI Keys**: Falls back to sequential generation
3. **Import Errors**: AI automatically fixes import statements
4. **Build Failures**: Recursive error fixing handles compilation issues

### Debug Mode

Enable debug logging by setting the log level:

```typescript
console.log(`[DependencyAwareGenerator] Job ${jobId}: Debug info`);
```

## Conclusion

The dependency-aware code generation system represents a significant improvement over the previous sequential approach. By generating files from leaf nodes to root nodes, it ensures that all dependencies are available when needed, significantly reducing compilation errors and improving code quality.

The system is robust, with automatic fallback mechanisms and comprehensive error handling, making it suitable for production use in the chart app generation pipeline. 