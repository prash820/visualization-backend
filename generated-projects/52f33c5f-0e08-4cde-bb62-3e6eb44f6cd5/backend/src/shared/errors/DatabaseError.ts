import { BaseError } from './BaseError';

export class DatabaseError extends BaseError {
  constructor(message: string) {
    super(message, 'DATABASE_ERROR', 500);
  }
}