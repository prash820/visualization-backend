import express, { Request, Response } from 'express';
import serverless from 'serverless-http';
import { LambdaFunction } from './LambdaFunction';
import { DynamoDBRepository } from '@/models/dynamodb';
import { CalculationRecord } from '@/types/calculation';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

const dynamoDBRepository = new DynamoDBRepository();

app.post('/calculate', async (req: Request, res: Response) => {
  try {
    const { expression } = req.body;
    if (!expression) {
      return res.status(400).json({ error: 'Expression is required' });
    }

    const result = await LambdaFunction.evaluateExpression(expression);
    const record: CalculationRecord = {
      id: uuidv4(),
      expression,
      result: result.toString(),
      timestamp: new Date().toISOString(),
    };

    await dynamoDBRepository.saveRecord(record);
    res.status(200).json({ id: record.id, result: record.result });
  } catch (error) {
    console.error('Error processing calculation:', error);
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
    console.error('Error retrieving calculation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).send('OK');
});

exports.handler = serverless(app);