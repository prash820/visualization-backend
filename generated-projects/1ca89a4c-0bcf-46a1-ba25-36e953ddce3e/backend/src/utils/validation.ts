export function isValidExpression(expression: string): boolean {
  const expressionPattern = /^[0-9+\-*/().\s]+$/;
  return expressionPattern.test(expression);
}

export function isValidNumber(value: any): boolean {
  return typeof value === 'number' && !isNaN(value);
}

export function validateCalculationInput(expression: string): void {
  if (!isValidExpression(expression)) {
    throw new Error('Invalid expression format.');
  }
}

export function validateResult(result: any): void {
  if (!isValidNumber(result)) {
    throw new Error('Invalid result format.');
  }
}