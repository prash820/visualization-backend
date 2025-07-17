import { LambdaFunctionService } from '../services/LambdaFunctionService';
import { CalculationRequest, CalculationResult } from '../models/CalculatorApp';

export class CalculatorAppService {
  static async performCalculation(expression: string): Promise<CalculationResult> {
    try {
      const result = await LambdaFunctionService.calculateAndStore(expression);
      return { result };
    } catch (error) {
      console.error('Error in CalculatorAppService:', error);
      throw new Error('Calculation failed');
    }
  }
}