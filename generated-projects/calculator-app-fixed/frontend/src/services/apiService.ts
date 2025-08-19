// apiService.ts

import { ArithmeticOperation, OperationResult } from './types';
import { handleError, validateArithmeticOperation } from './utils';

// API endpoint constants
const API_BASE_URL = 'https://api.calceasy.com';
const CALCULATE_ENDPOINT = `${API_BASE_URL}/calculate`;

// Function to perform a calculation via the backend API
export async function performCalculation(operation: ArithmeticOperation): Promise<OperationResult> {
  try {
    if (!validateArithmeticOperation(operation)) {
      throw new Error('Invalid operation data');
    }

    const response = await fetch(CALCULATE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(operation),
    });

    if (!response.ok) {
      throw new Error('Failed to perform calculation');
    }

    const result: OperationResult = await response.json();
    return result;
  } catch (error) {
    handleError(error);
    return 'Error';
  }
}

// Function to fetch calculation history from the backend API
export async function fetchCalculationHistory(): Promise<CalculationHistoryEntry[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/history`);
    if (!response.ok) {
      throw new Error('Failed to fetch calculation history');
    }
    const history: CalculationHistoryEntry[] = await response.json();
    return history;
  } catch (error) {
    handleError(error);
    return [];
  }
}

// Function to clear calculation history via the backend API
export async function clearCalculationHistory(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/history`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to clear calculation history');
    }
    return true;
  } catch (error) {
    handleError(error);
    return false;
  }
}
