export const config = {
  jwtSecret: process.env.JWT_SECRET || 'secret',
  dbUri: process.env.DB_URI || 'mongodb://localhost:27017/freelance'
};