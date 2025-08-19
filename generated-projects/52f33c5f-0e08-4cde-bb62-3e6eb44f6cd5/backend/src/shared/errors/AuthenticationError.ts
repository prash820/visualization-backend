import { BaseError } from './BaseError';

export class AuthenticationError extends BaseError {
  constructor(message: string) {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}