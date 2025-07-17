const { generateBackendFile } = require('./src/agents/backendComponentAgent');

async function testImprovedBackendAgent() {
  console.log('Testing improved backend component agent...\n');

  // Test case 1: Service file generation
  console.log('=== Test 1: Service File Generation ===');
  const serviceFile = {
    path: 'src/services/CalculatorService.ts',
    description: 'Calculator service for performing mathematical calculations',
    dependencies: ['../models/DatabaseModel.ts', '../utils/validation.ts']
  };

  const backendPlan = {
    fileStructure: {
      backend: [
        {
          path: 'src/models/DatabaseModel.ts',
          content: `import { DynamoDB } from 'aws-sdk';

interface Calculation {
  expression: string;
  result: number;
}

export class DatabaseModel {
  private dynamoDb: DynamoDB.DocumentClient;
  private tableName: string;

  constructor() {
    this.dynamoDb = new DynamoDB.DocumentClient();
    this.tableName = process.env.DYNAMODB_TABLE_CALC || 'DynamoDBCalc';
  }

  async saveCalculation(expression: string, result: number): Promise<void> {
    const params = {
      TableName: this.tableName,
      Item: {
        expression,
        result,
        timestamp: new Date().toISOString(),
      },
    };

    try {
      await this.dynamoDb.put(params).promise();
    } catch (error: any) {
      throw new Error(\`Error saving calculation: \${error.message}\`);
    }
  }

  async getCalculationHistory(): Promise<Calculation[]> {
    const params = {
      TableName: this.tableName,
    };

    try {
      const data = await this.dynamoDb.scan(params).promise();
      return data.Items as Calculation[];
    } catch (error: any) {
      throw new Error(\`Error retrieving calculation history: \${error.message}\`);
    }
  }
}

export { DatabaseModel, Calculation };`
        },
        {
          path: 'src/utils/validation.ts',
          content: `export function validateExpression(expression: string): boolean {
  if (!expression || typeof expression !== 'string') {
    return false;
  }
  return /^[0-9+\\-*/().\\s]+$/.test(expression);
}

export function validateScientificNotation(value: number): boolean {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}`
        }
      ]
    }
  };

  try {
    const serviceCode = await generateBackendFile(serviceFile, backendPlan, './test-project');
    console.log('Generated service code:');
    console.log(serviceCode);
    console.log('\n✅ Service file generated successfully');
  } catch (error) {
    console.error('❌ Service file generation failed:', error);
  }

  // Test case 2: Route file generation
  console.log('\n=== Test 2: Route File Generation ===');
  const routeFile = {
    path: 'src/routes/calculator.ts',
    description: 'Calculator routes for mathematical operations',
    dependencies: ['../services/CalculatorService.ts']
  };

  const routePlan = {
    fileStructure: {
      backend: [
        {
          path: 'src/services/CalculatorService.ts',
          content: `import { DatabaseModel } from '../models/DatabaseModel';
import { validateExpression } from '../utils/validation';

interface CalculationRequest {
  expression: string;
}

interface CalculationResponse {
  result: number;
}

export class CalculatorService {
  private databaseModel: DatabaseModel;

  constructor(databaseModel: DatabaseModel) {
    this.databaseModel = databaseModel;
  }

  async performCalculation(expression: string): Promise<CalculationResponse> {
    if (!validateExpression(expression)) {
      throw new Error('Invalid expression');
    }

    const result = this.evaluateExpression(expression);
    await this.databaseModel.saveCalculation(expression, result);

    return { result };
  }

  private evaluateExpression(expression: string): number {
    try {
      return eval(expression);
    } catch (error: any) {
      throw new Error('Error evaluating expression');
    }
  }
}`
        }
      ]
    }
  };

  try {
    const routeCode = await generateBackendFile(routeFile, routePlan, './test-project');
    console.log('Generated route code:');
    console.log(routeCode);
    console.log('\n✅ Route file generated successfully');
  } catch (error) {
    console.error('❌ Route file generation failed:', error);
  }

  // Test case 3: Middleware file generation
  console.log('\n=== Test 3: Middleware File Generation ===');
  const middlewareFile = {
    path: 'src/middleware/logging.ts',
    description: 'Logging middleware for request tracking'
  };

  try {
    const middlewareCode = await generateBackendFile(middlewareFile, {}, './test-project');
    console.log('Generated middleware code:');
    console.log(middlewareCode);
    console.log('\n✅ Middleware file generated successfully');
  } catch (error) {
    console.error('❌ Middleware file generation failed:', error);
  }

  console.log('\n=== Test Summary ===');
  console.log('✅ All tests completed');
  console.log('The improved backend agent should now generate more consistent code with:');
  console.log('- Proper import/export patterns');
  console.log('- Consistent method signatures');
  console.log('- Proper error handling with "catch (error: any)"');
  console.log('- Lambda-specific optimizations');
}

testImprovedBackendAgent().catch(console.error); 