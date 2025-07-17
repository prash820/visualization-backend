import { CalculationModel, Calculation } from '../models/Calculation';
import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

export class CalculationService {
  private calculationModel: CalculationModel;

  constructor() {
    const dbClient = new DynamoDB.DocumentClient();
    const tableName = process.env.DYNAMODB_TABLE_NAME!;
    this.calculationModel = new CalculationModel(tableName, dbClient);
  }

  async calculateAndSave(expression: string, userId: string): Promise<Calculation> {
    const result = this.evaluateExpression(expression);
    const calculation: Calculation = {
      id: uuidv4(),
      expression,
      result: result.toString(),
      userId,
      createdAt: new Date().toISOString(),
    };
    await this.calculationModel.saveCalculation(calculation);
    return calculation;
  }

  async getCalculationById(id: string): Promise<Calculation | null> {
    return this.calculationModel.getCalculationById(id);
  }

  private evaluateExpression(expression: string): number {
    // Basic evaluation logic, replace with a proper math library for scientific calculations
    return eval(expression);
  }
}