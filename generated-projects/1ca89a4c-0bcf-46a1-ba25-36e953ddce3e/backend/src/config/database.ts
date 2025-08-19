// Local Database Configuration
import { Sequelize } from 'sequelize';
import * as path from 'path';

const isDevelopment = process.env.NODE_ENV === 'development';
const isLocal = process.env.NODE_ENV !== 'production';

export const databaseConfig = {
  development: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '../../local-dev.db'),
    logging: isDevelopment ? console.log : false,
    define: {
      timestamps: true,
      underscored: true
    }
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
};

export const sequelize = new Sequelize(
  isLocal ? databaseConfig.development : databaseConfig.production
);

export default sequelize;
