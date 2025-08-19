import { BaseError } from './BaseError';

export class AuthorizationError extends BaseError {
  constructor(message: string) {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}