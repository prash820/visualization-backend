import express from 'express';
import { config } from './environment';

const app = express();

app.set('port', config.PORT);

export default app;