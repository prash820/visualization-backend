// utils.ts

import { ApiError } from './types';

// Utility function to handle API errors
export function handleApiError(error: any): ApiError {
  if (error.response && error.response.data) {
    return { message: error.response.data.message, code: error.response.status };
  }
  return { message: error.message || 'An unknown error occurred' };
}

// Utility function to generate unique IDs
export function generateUniqueId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Utility function to validate email format
export function validateEmail(email: string): boolean {
  const re = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
  return re.test(email);
}

// Utility function to validate password strength
export function validatePassword(password: string): boolean {
  return password.length >= 8;
}

// Utility function to perform an arithmetic operation
interface ArithmeticOperation {
  operand1: number;
  operand2: number;
  operator: '+' | '-' | '*' | '/';
}

type OperationResult = number | 'Error';

export function performArithmeticOperation(operation: ArithmeticOperation): OperationResult {
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

// Utility function to handle errors
export function handleError(error: Error): void {
  console.error('An error occurred:', error.message);
  // Additional error handling logic can be added here, such as logging to an external service
}

// Utility function to validate arithmetic operation data
export function validateArithmeticOperation(operation: ArithmeticOperation): boolean {
  if (isNaN(operation.operand1) || isNaN(operation.operand2)) {
    console.error('Validation failed: Operands must be numbers.');
    return false;
  }
  if (!['+', '-', '*', '/'].includes(operation.operator)) {
    console.error('Validation failed: Invalid operator.');
    return false;
  }
  return true;
}

// Utility function to initialize calculator state
interface CalculatorState {
  currentInput: string;
  history: string[];
}

export function initializeCalculatorState(): CalculatorState {
  return { currentInput: '', history: [] };
}

// Utility function to process calculator actions
interface CalculatorAction {
  type: 'ADD_DIGIT' | 'SET_OPERATOR' | 'CLEAR' | 'CALCULATE_RESULT';
  payload?: any;
}

export function processCalculatorAction(state: CalculatorState, action: CalculatorAction): CalculatorState {
  try {
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
  } catch (error) {
    handleError(error);
  }
  return state;
}
