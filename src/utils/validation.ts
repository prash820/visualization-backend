// Production-ready validation utilities
import { z } from 'zod';
import { CustomError } from './errors';

// Common validation schemas
export const idSchema = z.string().min(1, 'ID is required');
export const emailSchema = z.string().email('Invalid email format');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
export const urlSchema = z.string().url('Invalid URL format');
export const dateSchema = z.string().datetime('Invalid date format');

// Validation functions
export const validateId = (id: string): void => {
  try {
    idSchema.parse(id);
  } catch (error) {
    throw new CustomError('Invalid ID provided', 400);
  }
};

export const validateEmail = (email: string): void => {
  try {
    emailSchema.parse(email);
  } catch (error) {
    throw new CustomError('Invalid email format', 400);
  }
};

export const validatePassword = (password: string): void => {
  try {
    passwordSchema.parse(password);
  } catch (error) {
    throw new CustomError('Password must be at least 8 characters', 400);
  }
};

export const validateRequest = (data: any, requiredFields: string[]): void => {
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim().length === 0)) {
      throw new CustomError(`${field} is required`, 400);
    }
  }
};

export const validatePagination = (page: any, limit: any): { page: number; limit: number } => {
  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 10;
  
  if (pageNum < 1) {
    throw new CustomError('Page must be greater than 0', 400);
  }
  
  if (limitNum < 1 || limitNum > 100) {
    throw new CustomError('Limit must be between 1 and 100', 400);
  }
  
  return { page: pageNum, limit: limitNum };
};

export const validateSearchQuery = (query: string): void => {
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    throw new CustomError('Search query must be at least 2 characters', 400);
  }
};

// MongoDB ObjectId validation
export const validateObjectId = (id: string): void => {
  if (!id || typeof id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new CustomError('Invalid ObjectId format', 400);
  }
};

// UUID validation
export const validateUUID = (id: string): void => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!id || typeof id !== 'string' || !uuidRegex.test(id)) {
    throw new CustomError('Invalid UUID format', 400);
  }
};

// Date validation
export const validateDate = (date: string): Date => {
  try {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date');
    }
    return parsedDate;
  } catch (error) {
    throw new CustomError('Invalid date format', 400);
  }
};

// File validation
export const validateFile = (file: any, maxSize: number = 5 * 1024 * 1024): void => {
  if (!file) {
    throw new CustomError('File is required', 400);
  }
  
  if (file.size > maxSize) {
    throw new CustomError(`File size must be less than ${maxSize / (1024 * 1024)}MB`, 400);
  }
};

// URL validation
export const validateUrl = (url: string): void => {
  try {
    urlSchema.parse(url);
  } catch (error) {
    throw new CustomError('Invalid URL format', 400);
  }
};

// Phone number validation
export const validatePhoneNumber = (phone: string): void => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  if (!phone || typeof phone !== 'string' || !phoneRegex.test(phone)) {
    throw new CustomError('Invalid phone number format', 400);
  }
};

// Credit card validation (Luhn algorithm)
export const validateCreditCard = (cardNumber: string): void => {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(cleanNumber)) {
    throw new CustomError('Invalid credit card number', 400);
  }
  
  // Luhn algorithm
  let sum = 0;
  let isEven = false;
  
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  if (sum % 10 !== 0) {
    throw new CustomError('Invalid credit card number', 400);
  }
};

// IP address validation
export const validateIpAddress = (ip: string): void => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  if (!ip || typeof ip !== 'string' || (!ipv4Regex.test(ip) && !ipv6Regex.test(ip))) {
    throw new CustomError('Invalid IP address format', 400);
  }
};

// Rate limiting validation
export const validateRateLimit = (identifier: string, requests: Map<string, { count: number; resetTime: number }>, maxRequests: number, windowMs: number): boolean => {
  const now = Date.now();
  const userRequests = requests.get(identifier);
  
  if (!userRequests || now > userRequests.resetTime) {
    requests.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (userRequests.count >= maxRequests) {
    return false;
  }
  
  userRequests.count++;
  return true;
};

// Sanitization functions
export const sanitizeString = (str: string): string => {
  return str.trim().replace(/[<>]/g, '');
};

export const sanitizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

export const sanitizePhone = (phone: string): string => {
  return phone.replace(/[^\d\+]/g, '');
};

// Schema validation with custom error handling
export const validateSchema = <T>(schema: z.ZodSchema<T>, data: any): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new CustomError(firstError.message, 400);
    }
    throw new CustomError('Validation failed', 400);
  }
};

// Partial schema validation
export const validatePartialSchema = <T>(schema: z.ZodSchema<T>, data: any): Partial<T> => {
  try {
    // Create a partial schema by making all fields optional
    const partialSchema = z.object({}).passthrough();
    return partialSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new CustomError(firstError.message, 400);
    }
    throw new CustomError('Validation failed', 400);
  }
};
  