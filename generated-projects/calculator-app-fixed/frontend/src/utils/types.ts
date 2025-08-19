// types.ts

// Interface for a basic arithmetic operation
export interface ArithmeticOperation {
  operand1: number;
  operand2: number;
  operator: '+' | '-' | '*' | '/';
}

// Type for the result of an arithmetic operation
export type OperationResult = number | 'Error';

// Interface for a calculation history entry
export interface CalculationHistoryEntry {
  operation: ArithmeticOperation;
  result: OperationResult;
}

// State type for the calculator
export interface CalculatorState {
  currentInput: string;
  history: CalculationHistoryEntry[];
}

// Initial state for the calculator
export const initialCalculatorState: CalculatorState = {
  currentInput: '',
  history: [],
};

// Action types for calculator operations
export type CalculatorAction =
  | { type: 'ADD_DIGIT'; payload: string }
  | { type: 'SET_OPERATOR'; payload: '+' | '-' | '*' | '/' }
  | { type: 'CLEAR' }
  | { type: 'CALCULATE_RESULT' };

// Utility function to perform an arithmetic operation
export function performOperation(operation: ArithmeticOperation): OperationResult {
  const { operand1, operand2, operator } = operation;
  try {
    switch (operator) {
      case '+':
        return operand1 + operand2;
      case '-':
        return operand1 - operand2;
      case '*':
        return operand1 * operand2;
      case '/':
        if (operand2 === 0) throw new Error('Division by zero');
        return operand1 / operand2;
      default:
        throw new Error('Invalid operator');
    }
  } catch (error) {
    console.error('Operation error:', error.message);
    return 'Error';
  }
}

// Reducer function for calculator state
export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction
): CalculatorState {
  switch (action.type) {
    case 'ADD_DIGIT':
      return { ...state, currentInput: state.currentInput + action.payload };
    case 'SET_OPERATOR':
      // Logic to handle setting the operator
      return state;
    case 'CLEAR':
      return { ...state, currentInput: '' };
    case 'CALCULATE_RESULT':
      // Logic to calculate the result and update history
      return state;
    default:
      throw new Error('Unhandled action type');
  }
}
