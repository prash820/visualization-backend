// ValidationMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import { AppError } from './types';
import { createAppError, ERROR_CODES } from './constants';
import { handleAppError } from './utils';

export class ValidationMiddleware {
  public static validateProject = (req: Request, res: Response, next: NextFunction): void => {
    const { id, name, description, ownerId, status } = req.body;

    if (!id || !name || !description || !ownerId || !status) {
      const error = createAppError('Missing required project fields', ERROR_CODES.GENERIC_ERROR);
      handleAppError(error);
      return res.status(400).json({ error: error.message, code: error.code });
    }

    next();
  };

  public static validateTask = (req: Request, res: Response, next: NextFunction): void => {
    const { id, title, description, projectId, assigneeId, status } = req.body;

    if (!id || !title || !description || !projectId || !assigneeId || !status) {
      const error = createAppError('Missing required task fields', ERROR_CODES.GENERIC_ERROR);
      handleAppError(error);
      return res.status(400).json({ error: error.message, code: error.code });
    }

    next();
  };

  public static validateUser = (req: Request, res: Response, next: NextFunction): void => {
    const { id, name, email, role } = req.body;

    if (!id || !name || !email || !role) {
      const error = createAppError('Missing required user fields', ERROR_CODES.GENERIC_ERROR);
      handleAppError(error);
      return res.status(400).json({ error: error.message, code: error.code });
    }

    next();
  };
}

// Usage example
// app.post('/projects', ValidationMiddleware.validateProject, (req, res) => { /* handle request */ });
// app.post('/tasks', ValidationMiddleware.validateTask, (req, res) => { /* handle request */ });
// app.post('/users', ValidationMiddleware.validateUser, (req, res) => { /* handle request */ });