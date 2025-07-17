import express, { Request, Response, NextFunction } from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import helmet from 'helmet';
import calculatorRoutes from './routes/calculatorRoutes';

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());

app.use('/api/calculator', calculatorRoutes);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

export const handler = serverless(app);