import { Router } from 'express';
import {
  getDatabaseInfo,
  getTables,
  getTableInfo,
  getTableData,
  executeQuery,
  getTableSchema
} from '../controllers/sqliteController';

const router = Router();

// Get database information
router.get('/info', getDatabaseInfo);

// Get all tables
router.get('/tables', getTables);

// Get table information
router.get('/table/:tableName', getTableInfo);

// Get table data with pagination
router.get('/table/:tableName/data', getTableData);

// Get table schema
router.get('/table/:tableName/schema', getTableSchema);

// Execute custom SQL query
router.post('/query', executeQuery);

export default router; 