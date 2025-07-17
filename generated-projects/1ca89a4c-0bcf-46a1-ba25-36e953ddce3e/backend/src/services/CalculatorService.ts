import { DatabaseModel } from '../models/DatabaseModel';
import { validateExpressionInput } from '../utils/validation';

interface CalculationRequest {
  expression: string;
}

interface CalculationResponse {
  result: number;
}

export class CalculatorService {
  private databaseModel: DatabaseModel;

  constructor() {
    this.databaseModel = new DatabaseModel();
  }

  public async performCalculation(request: CalculationRequest): Promise<CalculationResponse> {
    try {
      const { expression } = request;
      
      if (!validateExpressionInput({ body: JSON.stringify({ expression }) } as any)) {
        throw new Error('Invalid expression');
      }

      const result = this.evaluateExpression(expression);
      await this.databaseModel.saveCalculation(expression, result);

      return { result };
    } catch (error: any) {
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('An error occurred during calculation');
    }
  }

  private evaluateExpression(expression: string): number {
    // Simple evaluation logic, replace with actual implementation
    return eval(expression);
  }
}

export default new CalculatorService();