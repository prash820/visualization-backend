import express, { Request, Response } from 'express';
import { LambdaFunctionService } from '../services/LambdaFunctionService';

export const calculateHandler = async (req: Request, res: Response) => {
  try {
    const { expression } = req.body;
    if (!expression) {
      return res.status(400).json({ error: 'Expression is required' });
    }
    const result = await LambdaFunctionService.calculateAndStore(expression);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error handling calculate request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};