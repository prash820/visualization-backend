import { Calculation } from '../models/Calculation';

class CalculatorService {
  calculate(expression: string): Calculation {
    try {
      if (!expression || typeof expression !== 'string') {
        throw new Error('Invalid expression');
      }

      const result = this.evaluateExpression(expression);
      const calculation: Calculation = {
        expression,
        result,
        timestamp: new Date(),
      };

      return calculation;
    } catch (error) {
      console.error('Calculation error:', error.message);
      throw new Error('Failed to calculate expression');
    }
  }

  private evaluateExpression(expression: string): number {
    try {
      // Using eval is dangerous and should be replaced with a proper math parser in production
      const result = eval(expression);
      if (typeof result !== 'number' || isNaN(result)) {
        throw new Error('Invalid calculation result');
      }
      return result;
    } catch (error) {
      console.error('Expression evaluation error:', error.message);
      throw new Error('Invalid mathematical expression');
    }
  }
}

export default CalculatorService;