class CalculatorService {
  evaluateExpression(expression: string): number {
    try {
      // Simple evaluation logic (not safe for production)
      return eval(expression);
    } catch (error) {
      throw new Error('Invalid expression');
    }
  }
}

export default new CalculatorService();