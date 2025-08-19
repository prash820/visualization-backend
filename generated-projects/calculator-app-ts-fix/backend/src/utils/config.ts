import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 3000;
export const API_URL = process.env.API_URL || 'http://localhost:3000';