// utils.ts

import { ArithmeticOperation, OperationResult } from './types';

// Utility function to perform an arithmetic operation
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

// Utility function to generate unique IDs
export function generateUniqueId(): string {
  return Math.random().toString(36).substr(2, 9);
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
export function initializeCalculatorState() {
  return { currentInput: '', history: [] };
}

// Utility function to process calculator actions
export function processCalculatorAction(state, action) {
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
