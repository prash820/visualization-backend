import { Calculation } from '../models/Calculation';

interface CalculationRequest {
  expression: string;
}

interface CalculationResponse {
  result: number;
  timestamp: Date;
}

export class CalculationService {
  performCalculation(request: CalculationRequest): CalculationResponse {
    const { expression } = request;
    if (!expression || typeof expression !== 'string') {
      throw new Error('Invalid expression');
    }

    let result: number;
    try {
      result = this.evaluateExpression(expression);
    } catch (error) {
      throw new Error('Error evaluating expression');
    }

    const calculation: Calculation = {
      expression,
      result,
      timestamp: new Date(),
    };

    return {
      result: calculation.result,
      timestamp: calculation.timestamp,
    };
  }

  private evaluateExpression(expression: string): number {
    // Basic validation to prevent code injection
    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
      throw new Error('Invalid characters in expression');
    }

    // Evaluate the mathematical expression
    // Note: Using eval is dangerous in production; consider using a math library
    return eval(expression);
  }
}