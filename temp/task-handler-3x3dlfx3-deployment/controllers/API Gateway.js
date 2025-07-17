```typescript
import express, { Request, Response, NextFunction } from 'express';
import serverless from 'serverless-http';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import cors from 'cors';

// Initialize Express app
const app = express();
app.use(express.json());
app.use(cors());

// AWS SDK v3 Clients
const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });

// TypeScript Interfaces
interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface ErrorResponse {
  message: string;
}

// Middleware for error handling
const errorHandler = (err: Error, req: Request, res: Response<ErrorResponse>, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
};

// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).send('OK');
});

// Get Task Endpoint
app.get('/tasks/:id', async (req: Request, res: Response<Task | ErrorResponse>) => {
  try {
    const taskId = req.params.id;
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: {
        id: { S: taskId }
      }
    };
    const command = new GetItemCommand(params);
    const data = await dynamoDBClient.send(command);

    if (!data.Item) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const task: Task = {
      id: data.Item.id.S!,
      title: data.Item.title.S!,
      description: data.Item.description.S!,
      completed: data.Item.completed.BOOL!
    };

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ message: 'Could not retrieve task' });
  }
});

// Get S3 Object Endpoint (example usage)
app.get('/s3-object/:key', async (req: Request, res: Response<ErrorResponse>) => {
  try {
    const key = req.params.key;
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key
    };
    const command = new GetObjectCommand(params);
    const data = await s3Client.send(command);

    res.setHeader('Content-Type', data.ContentType!);
    data.Body!.pipe(res);
  } catch (error) {
    console.error('Error fetching S3 object:', error);
    res.status(500).json({ message: 'Could not retrieve S3 object' });
  }
});

// Use error handling middleware
app.use(errorHandler);

// Export the handler for AWS Lambda
exports.handler = serverless(app);
```