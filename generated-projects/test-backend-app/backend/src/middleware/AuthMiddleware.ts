// AuthMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import { UserService } from './UserService';
import { AppError, User } from './types';
import { createAppError, ERROR_CODES } from './constants';
import { handleAppError } from './utils';

export class AuthMiddleware {
  private userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  public authenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const userId = req.header('X-User-Id');
      if (!userId) {
        throw createAppError('User ID header is missing', ERROR_CODES.UNAUTHORIZED);
      }

      const user: User | null = this.userService.getUserById(userId);
      if (!user) {
        throw createAppError('User not found', ERROR_CODES.UNAUTHORIZED);
      }

      req.user = user;
      next();
    } catch (error) {
      const appError = error as AppError;
      handleAppError(appError);
      res.status(401).json({ error: appError.message, code: appError.code });
    }
  };
}

// Usage example
// const userService = new UserService(users);
// const authMiddleware = new AuthMiddleware(userService);
// app.use(authMiddleware.authenticate);