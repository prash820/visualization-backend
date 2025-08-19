import { Request, Response } from 'express';
import { databaseService } from '../services/databaseService';
import { memoryManager } from '../utils/memoryManager';
import asyncHandler from '../utils/asyncHandler';

// Get database information
export const getDatabaseInfo = asyncHandler(async (req: Request, res: Response) => {
  try {
    const tables = await databaseService.getAllTables();
    const totalTables = tables.length;
    const databasePath = databaseService.getDatabasePath();

    res.json({
      tables,
      totalTables,
      databasePath
    });
  } catch (error) {
    console.error('Error getting database info:', error);
    res.status(500).json({ error: 'Failed to get database information' });
  }
});

// Get all tables
export const getTables = asyncHandler(async (req: Request, res: Response) => {
  try {
    const tables = await databaseService.getAllTables();
    res.json(tables);
  } catch (error) {
    console.error('Error getting tables:', error);
    res.status(500).json({ error: 'Failed to get tables' });
  }
});

// Get table information
export const getTableInfo = asyncHandler(async (req: Request, res: Response) => {
  const { tableName } = req.params;
  
  if (!tableName) {
    return res.status(400).json({ error: 'Table name is required' });
  }

  try {
    const schema = await databaseService.getTableSchema(tableName);
    const rowCount = await databaseService.getTableRowCount(tableName);

    res.json({
      name: tableName,
      schema,
      rowCount
    });
  } catch (error) {
    console.error('Error getting table info:', error);
    res.status(500).json({ error: 'Failed to get table information' });
  }
});

// Get table data with pagination
export const getTableData = asyncHandler(async (req: Request, res: Response) => {
  const { tableName } = req.params;
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;
  
  if (!tableName) {
    return res.status(400).json({ error: 'Table name is required' });
  }

  try {
    const result = await databaseService.getTableData(tableName, limit, offset);
    res.json(result);
  } catch (error) {
    console.error('Error getting table data:', error);
    res.status(500).json({ error: 'Failed to get table data' });
  }
});

// Execute custom SQL query
export const executeQuery = asyncHandler(async (req: Request, res: Response) => {
  const { sql, params } = req.body;
  
  if (!sql) {
    return res.status(400).json({ error: 'SQL query is required' });
  }

  try {
    // Check memory usage before executing query
    const memoryStats = memoryManager.getMemoryStats();
    console.log(`[SQLite] Memory before query: ${memoryStats.percentage}% (${memoryStats.used}MB/${memoryStats.total}MB)`);
    
    if (memoryStats.isHigh) {
      console.log('[SQLite] High memory usage detected, triggering garbage collection');
      memoryManager.forceGarbageCollection();
    }

    const result = await databaseService.executeQuery(sql, params);
    
    // Check memory usage after executing query
    const afterMemoryStats = memoryManager.getMemoryStats();
    console.log(`[SQLite] Memory after query: ${afterMemoryStats.percentage}% (${afterMemoryStats.used}MB/${afterMemoryStats.total}MB)`);
    
    res.json(result);
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ 
      error: 'Failed to execute query',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get table schema
export const getTableSchema = asyncHandler(async (req: Request, res: Response) => {
  const { tableName } = req.params;
  
  if (!tableName) {
    return res.status(400).json({ error: 'Table name is required' });
  }

  try {
    const schema = await databaseService.getTableSchema(tableName);
    res.json(schema);
  } catch (error) {
    console.error('Error getting table schema:', error);
    res.status(500).json({ error: 'Failed to get table schema' });
  }
}); 