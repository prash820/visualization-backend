export interface CalculationRequest {
  expression: string;
}

export interface CalculationResponse {
  id: string;
  result: string;
}