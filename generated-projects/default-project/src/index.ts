import express from 'express';
import serverless from 'serverless-http';
import calculationRoutes from './routes/CalculationController';

const app = express();

app.use(express.json());
app.use('/api', calculationRoutes);

app.get('/health', (req, res) => res.status(200).send('OK'));

exports.handler = serverless(app);