```typescript
import { DynamoDB } from '../models/DynamoDB';
import { Request, Response } from 'express';

export class LambdaFunction {
    private dynamoDB: DynamoDB;

    constructor(dynamoDB: DynamoDB) {
        this.dynamoDB = dynamoDB;
    }

    public async handleRequest(req: Request, res: Response): Promise<void> {
        try {
            const { expression } = req.body;
            if (!expression) {
                res.status(400).json({ error: 'Expression is required' });
                return;
            }

            const result = this.calculateExpression(expression);
            const record = await this.dynamoDB.saveCalculation({ expression, result });

            res.status(200).json({ id: record.id, expression: record.expression, result: record.result });
        } catch (error) {
            console.error('Error handling request:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    private calculateExpression(expression: string): string {
        // Placeholder for actual scientific calculation logic
        // Implement the calculation logic here
        return eval(expression).toString();
    }
}
```