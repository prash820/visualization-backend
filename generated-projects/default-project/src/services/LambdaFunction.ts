import express, { Request, Response } from 'express';
import serverless from 'serverless-http';
import { CalculationService } from '@/services/calculationservice';
import { DynamoDBRepositoryImpl } from '@/models/dynamodb';
import { Calculation } from '@/models/calculation';

const app = express();
app.use(express.json());

const dynamoDBRepository = new DynamoDBRepositoryImpl();
const calculationService = new CalculationService();

app.post('/calculate', async (req: Request, res: Response) => {
  try {
    const { expression } = req.body;
    if (!expression) {
      return res.status(400).json({ error: 'Expression is required' });
    }

    const result = calculationService.evaluateExpression(expression);
    const calculation: Calculation = {
      id: new Date().toISOString(),
      expression,
      result: result.toString(),
      timestamp: new Date(),
    };

    await dynamoDBRepository.saveRecord(calculation);
    res.status(200).json({ result });
  } catch (error) {
    console.error('Error handling calculation request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/calculation/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const calculation = await dynamoDBRepository.retrieveRecord(id);

    if (!calculation) {
      return res.status(404).json({ error: 'Calculation not found' });
    }

    res.status(200).json(calculation);
  } catch (error) {
    console.error('Error retrieving calculation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK' });
});

exports.handler = serverless(app);