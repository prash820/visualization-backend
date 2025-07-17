import express, { Request, Response } from 'express';
import serverless from 'serverless-http';
import { LambdaFunction } from './LambdaFunction';
import { DynamoDBRepository } from '@/models/dynamodb';
import { CalculationRecord } from '@/types/calculation';

const app = express();
app.use(express.json());

const dynamoDBRepository = new DynamoDBRepository();

app.post('/calculate', async (req: Request, res: Response) => {
  try {
    const { expression } = req.body;
    if (!expression) {
      return res.status(400).json({ error: 'Expression is required' });
    }

    const lambdaFunction = new LambdaFunction();
    const result = await lambdaFunction.performCalculation(expression);

    const record: CalculationRecord = {
      id: new Date().toISOString(),
      expression,
      result: result.toString(),
      timestamp: new Date().toISOString(),
    };

    await dynamoDBRepository.saveRecord(record);

    res.status(200).json({ result });
  } catch (error) {
    console.error('Error handling calculation request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/calculation/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const record = await dynamoDBRepository.retrieveRecord(id);
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.status(200).json(record);
  } catch (error) {
    console.error('Error retrieving calculation record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK' });
});

exports.handler = serverless(app);