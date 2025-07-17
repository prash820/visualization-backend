const path = require('path');

// Mock the dependency-aware generator without AI dependencies
class DependencyAnalysisTester {
  constructor(projectPath, jobId) {
    this.projectPath = projectPath;
    this.jobId = jobId;
    this.dependencyGraph = {
      components: new Map(),
      sortedOrder: [],
      cycles: []
    };
    this.generatedFiles = new Map();
  }

  async analyzeDependencies(codePlan) {
    console.log(`[DependencyTester] Job ${this.jobId}: Analyzing dependencies...`);
    
    // Initialize components from file structure
    if (codePlan.fileStructure?.frontend) {
      for (const file of codePlan.fileStructure.frontend) {
        this.addComponentToGraph(file, 'frontend');
      }
    }
    
    if (codePlan.fileStructure?.backend) {
      for (const file of codePlan.fileStructure.backend) {
        this.addComponentToGraph(file, 'backend');
      }
    }
    
    // Build dependency relationships
    this.buildDependencyRelationships(codePlan);
    
    console.log(`[DependencyTester] Job ${this.jobId}: Dependency analysis complete - ${this.dependencyGraph.components.size} components`);
  }

  addComponentToGraph(file, type) {
    const componentName = this.extractComponentName(file.path);
    const category = this.extractCategory(file.path);
    
    const component = {
      name: componentName,
      type,
      category,
      dependencies: file.dependencies || [],
      dependents: [],
      complexity: this.calculateComplexity(file.content),
      generationOrder: -1,
      filePath: file.path,
      content: file.content
    };
    
    this.dependencyGraph.components.set(componentName, component);
  }

  buildDependencyRelationships(codePlan) {
    // Process explicit dependencies from CodePlan
    if (codePlan.frontendDependencies) {
      for (const dep of codePlan.frontendDependencies) {
        this.addDependency(dep.from, dep.to, dep.type);
      }
    }
    
    if (codePlan.backendDependencies) {
      for (const dep of codePlan.backendDependencies) {
        this.addDependency(dep.from, dep.to, dep.type);
      }
    }
    
    // Add implicit dependencies based on imports
    this.addImplicitDependencies();
  }

  addDependency(from, to, type) {
    const fromComp = this.dependencyGraph.components.get(from);
    const toComp = this.dependencyGraph.components.get(to);
    
    if (fromComp && toComp) {
      if (!fromComp.dependencies.includes(to)) {
        fromComp.dependencies.push(to);
      }
      if (!toComp.dependents.includes(from)) {
        toComp.dependents.push(from);
      }
    }
  }

  addImplicitDependencies() {
    for (const [name, component] of this.dependencyGraph.components) {
      if (component.content) {
        const imports = this.extractImports(component.content);
        for (const importName of imports) {
          this.addDependency(name, importName, 'imports');
        }
      }
    }
  }

  performTopologicalSort() {
    console.log(`[DependencyTester] Job ${this.jobId}: Performing topological sort...`);
    
    const visited = new Set();
    const tempVisited = new Set();
    const sorted = [];
    const cycles = [];
    
    const visit = (nodeName, path = []) => {
      if (tempVisited.has(nodeName)) {
        // Circular dependency detected
        const cycle = [...path, nodeName];
        cycles.push(cycle);
        console.warn(`[DependencyTester] Circular dependency detected: ${cycle.join(' -> ')}`);
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
    
    this.dependencyGraph.sortedOrder = sorted;
    this.dependencyGraph.cycles = cycles;
    
    console.log(`[DependencyTester] Job ${this.jobId}: Topological sort complete - ${sorted.length} components, ${cycles.length} cycles`);
  }

  extractComponentName(filePath) {
    const fileName = path.basename(filePath, path.extname(filePath));
    return fileName.charAt(0).toUpperCase() + fileName.slice(1);
  }

  extractCategory(filePath) {
    const parts = filePath.split('/');
    return parts[1] || 'components';
  }

  calculateComplexity(content) {
    if (!content) return 1;
    const lines = content.split('\n').length;
    const functions = (content.match(/function|=>/g) || []).length;
    const imports = (content.match(/import/g) || []).length;
    return Math.min(3, Math.max(1, Math.floor((lines + functions + imports) / 20)));
  }

  extractImports(content) {
    const imports = [];
    const importRegex = /import\s+(?:\{[^}]*\}|\*\s+as\s+)?(\w+)/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  getAnalysisResults() {
    return {
      components: Array.from(this.dependencyGraph.components.values()),
      sortedOrder: this.dependencyGraph.sortedOrder,
      cycles: this.dependencyGraph.cycles
    };
  }
}

async function testDependencyAnalysis() {
  console.log('🧪 Testing Dependency Analysis and Topological Sorting...');
  
  const projectPath = path.join(__dirname, 'test-dependency-analysis');
  const jobId = 'test-analysis-' + Date.now();
  
  console.log(`📁 Project path: ${projectPath}`);
  console.log(`🆔 Job ID: ${jobId}`);
  
  // Create a sample CodePlan with dependencies
  const sampleCodePlan = {
    fileStructure: {
      frontend: [
        {
          path: 'src/components/Button.tsx',
          content: `import React from 'react';
import { ButtonProps } from '../types/ButtonTypes';

export const Button: React.FC<ButtonProps> = ({ children, onClick }) => {
  return <button onClick={onClick}>{children}</button>;
};`,
          dependencies: ['ButtonTypes'],
          description: 'Reusable button component'
        },
        {
          path: 'src/types/ButtonTypes.ts',
          content: `export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
}`,
          dependencies: [],
          description: 'Button type definitions'
        },
        {
          path: 'src/components/Form.tsx',
          content: `import React from 'react';
import { Button } from './Button';
import { FormProps } from '../types/FormTypes';

export const Form: React.FC<FormProps> = ({ onSubmit, children }) => {
  return (
    <form onSubmit={onSubmit}>
      {children}
      <Button type="submit">Submit</Button>
    </form>
  );
};`,
          dependencies: ['Button', 'FormTypes'],
          description: 'Form component using Button'
        },
        {
          path: 'src/types/FormTypes.ts',
          content: `export interface FormProps {
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}`,
          description: 'Form type definitions'
        }
      ],
      backend: [
        {
          path: 'src/models/User.ts',
          content: `export interface User {
  id: string;
  name: string;
  email: string;
}`,
          dependencies: [],
          description: 'User model'
        },
        {
          path: 'src/services/UserService.ts',
          content: `import { User } from '../models/User';

export class UserService {
  async getUsers(): Promise<User[]> {
    // Implementation
    return [];
  }
}`,
          dependencies: ['User'],
          description: 'User service using User model'
        }
      ]
    },
    frontendDependencies: [
      { from: 'Button', to: 'ButtonTypes', type: 'imports' },
      { from: 'Form', to: 'Button', type: 'imports' },
      { from: 'Form', to: 'FormTypes', type: 'imports' }
    ],
    backendDependencies: [
      { from: 'UserService', to: 'User', type: 'imports' }
    ]
  };
  
  try {
    console.log('🔧 Creating dependency analyzer...');
    const analyzer = new DependencyAnalysisTester(projectPath, jobId);
    
    console.log('📊 Running dependency analysis...');
    await analyzer.analyzeDependencies(sampleCodePlan);
    
    console.log('🔄 Performing topological sort...');
    analyzer.performTopologicalSort();
    
    const results = analyzer.getAnalysisResults();
    
    console.log('\n📊 Analysis Results:');
    console.log(`📄 Total Components: ${results.components.length}`);
    console.log(`🔄 Sorted Order: ${results.sortedOrder.length} components`);
    console.log(`🔄 Circular Dependencies: ${results.cycles.length}`);
    
    console.log('\n📝 Component Details:');
    results.components.forEach(comp => {
      console.log(`  - ${comp.name} (${comp.type}/${comp.category})`);
      console.log(`    Order: ${comp.generationOrder}`);
      console.log(`    Dependencies: ${comp.dependencies.join(', ') || 'none'}`);
      console.log(`    Dependents: ${comp.dependents.join(', ') || 'none'}`);
      console.log(`    Complexity: ${comp.complexity}`);
    });
    
    console.log('\n🔄 Generation Order:');
    results.sortedOrder.forEach((name, index) => {
      const comp = results.components.find(c => c.name === name);
      console.log(`  ${index + 1}. ${name} (${comp?.type}/${comp?.category})`);
    });
    
    if (results.cycles.length > 0) {
      console.log('\n⚠️ Circular Dependencies Detected:');
      results.cycles.forEach((cycle, index) => {
        console.log(`  Cycle ${index + 1}: ${cycle.join(' -> ')}`);
      });
    }
    
    // Summary
    console.log('\n🎯 Summary:');
    console.log('✅ Dependency analysis completed successfully!');
    console.log('   - Components analyzed and dependencies mapped');
    console.log('   - Topological sort performed');
    console.log('   - Generation order determined');
    
    if (results.cycles.length === 0) {
      console.log('   - No circular dependencies detected');
      console.log('   - Files can be generated in dependency order');
    } else {
      console.log('   - Circular dependencies detected - manual resolution needed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDependencyAnalysis().catch(console.error); 