class CalculatorService {
  public evaluate(expression: string): number {
    // Simple evaluation logic for demonstration
    try {
      return eval(expression);
    } catch {
      throw new Error('Invalid expression');
    }
  }
}

export default new CalculatorService();