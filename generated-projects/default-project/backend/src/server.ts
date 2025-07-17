import express from 'express';
import cors from 'cors';
import lambdaFunctionRoutes from './routes/LambdaFunction';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api', lambdaFunctionRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});