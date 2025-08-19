import { DatabaseModel } from '../models/DatabaseModel';
import { isValidExpression } from '../utils/validation';

interface CalculationResult {
  expression: string;
  result: number;
}

export class CalculatorService {
  private databaseModel: DatabaseModel;

  constructor() {
    this.databaseModel = new DatabaseModel();
  }

  public async performCalculation(expression: string): Promise<CalculationResult> {
    try {
      if (!isValidExpression(expression)) {
        throw new Error('Invalid expression');
      }

      const result = eval(expression); // Note: eval is used here for simplicity; consider using a safer alternative in production
      console.log('Result:', result);
      await this.databaseModel.saveCalculation(expression, result);

      return { expression, result };
    } catch (error: any) {
      if (error.message) {
        throw new Error(`Calculation error: ${error.message}`);
      }
      throw new Error('An unexpected error occurred during calculation');
    }
  }

  public async getCalculationHistory(): Promise<CalculationResult[]> {
    try {
      return await this.databaseModel.getCalculationHistory();
    } catch (error: any) {
      if (error.message) {
        throw new Error(`Error retrieving history: ${error.message}`);
      }
      throw new Error('An unexpected error occurred while retrieving history');
    }
  }
}

export default new CalculatorService();