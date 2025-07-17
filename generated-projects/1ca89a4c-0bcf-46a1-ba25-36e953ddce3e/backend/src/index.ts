import express, { Request, Response, NextFunction } from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import authMiddleware from './middleware/auth';
import loggingMiddleware from './middleware/logging';

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(loggingMiddleware);
app.use(authMiddleware);

app.use('/api', routes);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err) {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(statusCode).json({ error: message });
  } else {
    next();
  }
});

export const handler = serverless(app);