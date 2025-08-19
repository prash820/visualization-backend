class CalculatorService {
  public static evaluateExpression(expression: string): string {
    try {
      return eval(expression).toString();
    } catch {
      throw new Error('Invalid expression');
    }
  }
}

export default CalculatorService;