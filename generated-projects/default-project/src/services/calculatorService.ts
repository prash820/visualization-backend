import { evaluate } from 'mathjs';

export const calculateExpression = async (expression: string): Promise<number> => {
  try {
    return evaluate(expression);
  } catch (error) {
    throw new Error('Invalid expression');
  }
};