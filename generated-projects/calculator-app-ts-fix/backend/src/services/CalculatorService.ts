class CalculatorService {
  public calculate(expression: string): string {
    // Simple evaluation logic
    try {
      const result = eval(expression);
      return result.toString();
    } catch (error) {
      throw new Error('Invalid expression');
    }
  }
}

export default new CalculatorService();