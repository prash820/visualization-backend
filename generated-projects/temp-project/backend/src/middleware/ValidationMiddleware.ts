// ValidationMiddleware.ts
import { Request, Response, NextFunction } from 'express';

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

const validateRequest = (req: Request): ValidationResult => {
  const errors: ValidationError[] = [];

  // Example validation logic
  if (!req.body.email || !validateEmail(req.body.email)) {
    errors.push({ field: 'email', message: 'Invalid email format.' });
  }

  if (!req.body.password || !validatePassword(req.body.password)) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters long.' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const validateEmail = (email: string): boolean => {
  const re = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
  return re.test(email);
};

const validatePassword = (password: string): boolean => {
  return password.length >= 8;
};

const ValidationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const validationResult = validateRequest(req);

  if (!validationResult.isValid) {
    return res.status(400).json({ errors: validationResult.errors });
  }

  next();
};

export default ValidationMiddleware;
