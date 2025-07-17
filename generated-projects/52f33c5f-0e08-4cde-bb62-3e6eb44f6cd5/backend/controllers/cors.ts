import cors from 'cors';
import { config } from '../config/environment';

const corsOptions = {
  origin: config.CORS_ORIGIN,
  optionsSuccessStatus: 200
};

export default cors(corsOptions);