import { LambdaFunction } from './LambdaFunction';
import { Request, Response } from 'express';

export class CalculatorApp {
    private lambdaFunction: LambdaFunction;

    constructor(lambdaFunction: LambdaFunction) {
        this.lambdaFunction = lambdaFunction;
    }

    public async performCalculation(req: Request, res: Response): Promise<void> {
        try {
            await this.lambdaFunction.handleRequest(req, res);
        } catch (error) {
            console.error('Error performing calculation:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}