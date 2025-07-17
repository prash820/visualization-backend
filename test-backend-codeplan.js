require('dotenv').config();

const { umlToBackendCodePlan } = require('./dist/utils/umlToCodePlan');

async function testBackendCodePlan() {
  console.log('🧪 Testing Backend Code Plan Generation\n');
  
  // Test 1: With sample UML diagrams
  console.log('📋 Test 1: With sample UML diagrams');
  console.log('=' .repeat(50));
  
  const sampleUmlDiagrams = {
    backendComponentDiagram: `
graph TD
    subgraph "Calculator API"
        A[CalculatorService]
        B[CalculatorController]
        C[CalculatorRoutes]
    end
    
    subgraph "Database Layer"
        D[CalculatorModel]
        E[DatabaseConnection]
    end
    
    A --> B
    B --> C
    A --> D
    D --> E
    `,
    
    backendClassDiagram: `
class CalculatorService {
    +calculate(operation: string, a: number, b: number): number
    +validateInput(a: number, b: number): boolean
    +logCalculation(operation: string, result: number): void
}

class CalculatorModel {
    +id: string
    +operation: string
    +operand1: number
    +operand2: number
    +result: number
    +timestamp: Date
    +save(): Promise<void>
    +findByOperation(operation: string): Promise<CalculatorModel[]>
}

class CalculatorController {
    +add(req: Request, res: Response): void
    +subtract(req: Request, res: Response): void
    +multiply(req: Request, res: Response): void
    +divide(req: Request, res: Response): void
}
    `,
    
    backendSequenceDiagram: `
sequenceDiagram
    participant Client
    participant CalculatorRoutes
    participant CalculatorController
    participant CalculatorService
    participant CalculatorModel
    participant Database
    
    Client->>CalculatorRoutes: POST /api/calculator/add
    CalculatorRoutes->>CalculatorController: add(request)
    CalculatorController->>CalculatorService: calculate("add", a, b)
    CalculatorService->>CalculatorModel: new CalculatorModel()
    CalculatorService->>CalculatorModel: save()
    CalculatorModel->>Database: INSERT
    Database-->>CalculatorModel: saved
    CalculatorModel-->>CalculatorService: result
    CalculatorService-->>CalculatorController: result
    CalculatorController-->>CalculatorRoutes: response
    CalculatorRoutes-->>Client: JSON response
    `
  };
  
  try {
    const backendCodePlan = await umlToBackendCodePlan(sampleUmlDiagrams);
    
    console.log('✅ Backend Code Plan generated successfully!');
    console.log('\n📁 Files that will be created:');
    console.log('=' .repeat(50));
    
    if (backendCodePlan.fileStructure && backendCodePlan.fileStructure.backend) {
      backendCodePlan.fileStructure.backend.forEach((file, index) => {
        console.log(`${index + 1}. ${file.path}`);
        console.log(`   Description: ${file.description || 'No description'}`);
        console.log(`   Dependencies: ${file.dependencies ? file.dependencies.join(', ') : 'None'}`);
        console.log(`   Type: ${file.type || 'Not specified'}`);
        console.log(`   Content preview: ${file.content ? file.content.substring(0, 100) + '...' : 'No content'}`);
        console.log('');
      });
    } else {
      console.log('❌ No backend files in fileStructure');
    }
    
    console.log('🔧 Backend Components:');
    if (backendCodePlan.backendComponents) {
      backendCodePlan.backendComponents.forEach((component, index) => {
        console.log(`${index + 1}. ${component.name}: ${component.description || 'No description'}`);
        console.log(`   Children: ${component.children ? component.children.join(', ') : 'None'}`);
      });
    }
    
    console.log('\n📊 Backend Models:');
    if (backendCodePlan.backendModels) {
      backendCodePlan.backendModels.forEach((model, index) => {
        console.log(`${index + 1}. ${model.name}: ${model.description || 'No description'}`);
        console.log(`   Properties: ${model.properties ? model.properties.join(', ') : 'None'}`);
        console.log(`   Methods: ${model.methods ? model.methods.join(', ') : 'None'}`);
      });
    }
    
    console.log('\n🔗 Backend Dependencies:');
    if (backendCodePlan.backendDependencies) {
      backendCodePlan.backendDependencies.forEach((dep, index) => {
        console.log(`${index + 1}. ${dep.from} -> ${dep.to} (${dep.type}): ${dep.description || 'No description'}`);
      });
    }
    
    console.log('\n🌐 API Endpoints:');
    if (backendCodePlan.integration && backendCodePlan.integration.apiEndpoints) {
      backendCodePlan.integration.apiEndpoints.forEach((endpoint, index) => {
        console.log(`${index + 1}. ${endpoint.method} ${endpoint.path}`);
        console.log(`   Frontend Component: ${endpoint.frontendComponent || 'None'}`);
        console.log(`   Backend Service: ${endpoint.backendService || 'None'}`);
        console.log(`   Description: ${endpoint.description || 'No description'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error generating backend code plan:', error.message);
  }
  
  // Test 2: With no UML diagrams (should generate basic structure)
  console.log('\n\n📋 Test 2: With no UML diagrams (basic structure)');
  console.log('=' .repeat(50));
  
  try {
    const basicBackendCodePlan = await umlToBackendCodePlan({});
    
    console.log('✅ Basic Backend Code Plan generated successfully!');
    console.log('\n📁 Basic files that will be created:');
    console.log('=' .repeat(50));
    
    if (basicBackendCodePlan.fileStructure && basicBackendCodePlan.fileStructure.backend) {
      basicBackendCodePlan.fileStructure.backend.forEach((file, index) => {
        console.log(`${index + 1}. ${file.path}`);
        console.log(`   Description: ${file.description || 'No description'}`);
        console.log(`   Dependencies: ${file.dependencies ? file.dependencies.join(', ') : 'None'}`);
        console.log(`   Type: ${file.type || 'Not specified'}`);
        console.log(`   Content preview: ${file.content ? file.content.substring(0, 100) + '...' : 'No content'}`);
        console.log('');
      });
    }
    
    console.log('🔧 Basic Backend Components:');
    if (basicBackendCodePlan.backendComponents) {
      basicBackendCodePlan.backendComponents.forEach((component, index) => {
        console.log(`${index + 1}. ${component.name}: ${component.description || 'No description'}`);
        console.log(`   Children: ${component.children ? component.children.join(', ') : 'None'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error generating basic backend code plan:', error.message);
  }
  
  console.log('\n✅ Backend Code Plan testing completed!');
}

// Run the test
testBackendCodePlan().catch(console.error); 