import { Request, Response } from 'express';
import { DynamoDBRepository } from '../repositories/DynamoDB';
import { CalculationRecord } from '../models/DynamoDB';

const dynamoDBRepository = new DynamoDBRepository();

export const saveRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const record: CalculationRecord = req.body;
    await dynamoDBRepository.saveRecord(record);
    res.status(201).send({ message: 'Record saved successfully' });
  } catch (error) {
    res.status(500).send({ error: 'Failed to save record' });
  }
};

export const retrieveRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const record = await dynamoDBRepository.retrieveRecord(id);
    if (record) {
      res.status(200).send(record);
    } else {
      res.status(404).send({ error: 'Record not found' });
    }
  } catch (error) {
    res.status(500).send({ error: 'Failed to retrieve record' });
  }
};