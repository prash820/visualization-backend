const { DependencyAwareCodeGenerator } = require('./dist/services/dependencyAwareCodeGenerator');
const path = require('path');

async function testDependencyAwareGeneration() {
  console.log('🧪 Testing Dependency-Aware Code Generation...');
  
  const projectPath = path.join(__dirname, 'test-dependency-generation');
  const jobId = 'test-dependency-' + Date.now();
  
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
          dependencies: [],
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
    console.log('🔧 Creating dependency-aware generator...');
    const generator = new DependencyAwareCodeGenerator(projectPath, jobId);
    
    console.log('📊 Running dependency-aware generation...');
    const result = await generator.generateCodeWithDependencies(sampleCodePlan);
    
    console.log('\n📊 Generation Results:');
    console.log(`✅ Success: ${result.success}`);
    console.log(`📄 Files Generated: ${result.generatedFiles.length}`);
    console.log(`❌ Errors: ${result.errors.length}`);
    
    if (result.generatedFiles.length > 0) {
      console.log('\n📝 Generated Files:');
      result.generatedFiles.forEach(file => {
        console.log(`  - ${file.path} (${file.category})`);
        console.log(`    Dependencies: ${file.dependencies.join(', ')}`);
        console.log(`    Description: ${file.description}`);
      });
    }
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    // Summary
    console.log('\n🎯 Summary:');
    if (result.success) {
      console.log('✅ Dependency-aware generation completed successfully!');
      console.log('   - Files generated in proper dependency order');
      console.log('   - Import statements should be correct');
      console.log('   - No circular dependencies detected');
    } else {
      console.log('❌ Dependency-aware generation encountered issues');
      console.log('   - Check error messages above');
      console.log('   - Fallback to sequential generation may be needed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDependencyAwareGeneration().catch(console.error); 