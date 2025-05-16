export const Configuration = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/visualization',
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
}; 