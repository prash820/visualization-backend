export interface CalculationResult {
  result: number;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}