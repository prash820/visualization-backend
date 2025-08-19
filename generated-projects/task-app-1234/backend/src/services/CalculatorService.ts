class CalculatorService {
  public evaluate(expression: string): number {
    try {
      // Simple evaluation logic, replace with a safe parser in production
      return eval(expression);
    } catch (error) {
      throw new Error('Invalid expression');
    }
  }
}

export default new CalculatorService();