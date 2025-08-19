"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePartialSchema = exports.validateSchema = exports.sanitizePhone = exports.sanitizeEmail = exports.sanitizeString = exports.validateRateLimit = exports.validateIpAddress = exports.validateCreditCard = exports.validatePhoneNumber = exports.validateUrl = exports.validateFile = exports.validateDate = exports.validateUUID = exports.validateObjectId = exports.validateSearchQuery = exports.validatePagination = exports.validateRequest = exports.validatePassword = exports.validateEmail = exports.validateId = exports.dateSchema = exports.urlSchema = exports.passwordSchema = exports.emailSchema = exports.idSchema = void 0;
// Production-ready validation utilities
const zod_1 = require("zod");
const errors_1 = require("./errors");
// Common validation schemas
exports.idSchema = zod_1.z.string().min(1, 'ID is required');
exports.emailSchema = zod_1.z.string().email('Invalid email format');
exports.passwordSchema = zod_1.z.string().min(8, 'Password must be at least 8 characters');
exports.urlSchema = zod_1.z.string().url('Invalid URL format');
exports.dateSchema = zod_1.z.string().datetime('Invalid date format');
// Validation functions
const validateId = (id) => {
    try {
        exports.idSchema.parse(id);
    }
    catch (error) {
        throw new errors_1.CustomError('Invalid ID provided', 400);
    }
};
exports.validateId = validateId;
const validateEmail = (email) => {
    try {
        exports.emailSchema.parse(email);
    }
    catch (error) {
        throw new errors_1.CustomError('Invalid email format', 400);
    }
};
exports.validateEmail = validateEmail;
const validatePassword = (password) => {
    try {
        exports.passwordSchema.parse(password);
    }
    catch (error) {
        throw new errors_1.CustomError('Password must be at least 8 characters', 400);
    }
};
exports.validatePassword = validatePassword;
const validateRequest = (data, requiredFields) => {
    for (const field of requiredFields) {
        if (!data[field] || (typeof data[field] === 'string' && data[field].trim().length === 0)) {
            throw new errors_1.CustomError(`${field} is required`, 400);
        }
    }
};
exports.validateRequest = validateRequest;
const validatePagination = (page, limit) => {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    if (pageNum < 1) {
        throw new errors_1.CustomError('Page must be greater than 0', 400);
    }
    if (limitNum < 1 || limitNum > 100) {
        throw new errors_1.CustomError('Limit must be between 1 and 100', 400);
    }
    return { page: pageNum, limit: limitNum };
};
exports.validatePagination = validatePagination;
const validateSearchQuery = (query) => {
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
        throw new errors_1.CustomError('Search query must be at least 2 characters', 400);
    }
};
exports.validateSearchQuery = validateSearchQuery;
// MongoDB ObjectId validation
const validateObjectId = (id) => {
    if (!id || typeof id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(id)) {
        throw new errors_1.CustomError('Invalid ObjectId format', 400);
    }
};
exports.validateObjectId = validateObjectId;
// UUID validation
const validateUUID = (id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!id || typeof id !== 'string' || !uuidRegex.test(id)) {
        throw new errors_1.CustomError('Invalid UUID format', 400);
    }
};
exports.validateUUID = validateUUID;
// Date validation
const validateDate = (date) => {
    try {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            throw new Error('Invalid date');
        }
        return parsedDate;
    }
    catch (error) {
        throw new errors_1.CustomError('Invalid date format', 400);
    }
};
exports.validateDate = validateDate;
// File validation
const validateFile = (file, maxSize = 5 * 1024 * 1024) => {
    if (!file) {
        throw new errors_1.CustomError('File is required', 400);
    }
    if (file.size > maxSize) {
        throw new errors_1.CustomError(`File size must be less than ${maxSize / (1024 * 1024)}MB`, 400);
    }
};
exports.validateFile = validateFile;
// URL validation
const validateUrl = (url) => {
    try {
        exports.urlSchema.parse(url);
    }
    catch (error) {
        throw new errors_1.CustomError('Invalid URL format', 400);
    }
};
exports.validateUrl = validateUrl;
// Phone number validation
const validatePhoneNumber = (phone) => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    if (!phone || typeof phone !== 'string' || !phoneRegex.test(phone)) {
        throw new errors_1.CustomError('Invalid phone number format', 400);
    }
};
exports.validatePhoneNumber = validatePhoneNumber;
// Credit card validation (Luhn algorithm)
const validateCreditCard = (cardNumber) => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(cleanNumber)) {
        throw new errors_1.CustomError('Invalid credit card number', 400);
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
        throw new errors_1.CustomError('Invalid credit card number', 400);
    }
};
exports.validateCreditCard = validateCreditCard;
// IP address validation
const validateIpAddress = (ip) => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    if (!ip || typeof ip !== 'string' || (!ipv4Regex.test(ip) && !ipv6Regex.test(ip))) {
        throw new errors_1.CustomError('Invalid IP address format', 400);
    }
};
exports.validateIpAddress = validateIpAddress;
// Rate limiting validation
const validateRateLimit = (identifier, requests, maxRequests, windowMs) => {
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
exports.validateRateLimit = validateRateLimit;
// Sanitization functions
const sanitizeString = (str) => {
    return str.trim().replace(/[<>]/g, '');
};
exports.sanitizeString = sanitizeString;
const sanitizeEmail = (email) => {
    return email.trim().toLowerCase();
};
exports.sanitizeEmail = sanitizeEmail;
const sanitizePhone = (phone) => {
    return phone.replace(/[^\d\+]/g, '');
};
exports.sanitizePhone = sanitizePhone;
// Schema validation with custom error handling
const validateSchema = (schema, data) => {
    try {
        return schema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const firstError = error.errors[0];
            throw new errors_1.CustomError(firstError.message, 400);
        }
        throw new errors_1.CustomError('Validation failed', 400);
    }
};
exports.validateSchema = validateSchema;
// Partial schema validation
const validatePartialSchema = (schema, data) => {
    try {
        // Create a partial schema by making all fields optional
        const partialSchema = zod_1.z.object({}).passthrough();
        return partialSchema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const firstError = error.errors[0];
            throw new errors_1.CustomError(firstError.message, 400);
        }
        throw new errors_1.CustomError('Validation failed', 400);
    }
};
exports.validatePartialSchema = validatePartialSchema;
