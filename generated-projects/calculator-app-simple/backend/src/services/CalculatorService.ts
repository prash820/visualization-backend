class CalculatorService {
  public static evaluate(expression: string): number {
    // Simple evaluation logic (not safe for production use)
    return eval(expression);
  }
}

export default CalculatorService;