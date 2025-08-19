"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRateLimit = exports.requireAdmin = exports.requireUser = exports.requireRole = exports.optionalAuth = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Enhanced authentication middleware
const authenticateToken = (req, res, next) => {
    console.log('[authenticateToken] Middleware called for path:', req.path);
    console.log('[authenticateToken] Method:', req.method);
    console.log('[authenticateToken] Headers:', req.headers);
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({
            error: 'Access denied. No token provided.',
            message: 'Please log in to access this resource.'
        });
        return;
    }
    try {
        const jwtSecret = process.env.JWT_SECRET || 'secret';
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        // Create a user object with the required fields
        const user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role || 'user'
        };
        req.user = user;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({
                error: 'Token expired.',
                message: 'Please log in again.'
            });
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(403).json({
                error: 'Invalid token.',
                message: 'Please log in again.'
            });
        }
        else {
            res.status(403).json({
                error: 'Token verification failed.',
                message: 'Please log in again.'
            });
        }
    }
};
exports.authenticateToken = authenticateToken;
// Optional authentication - doesn't fail if no token
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        req.user = undefined;
        next();
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        const user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role || 'user'
        };
        req.user = user;
        next();
    }
    catch (error) {
        req.user = undefined;
        next();
    }
};
exports.optionalAuth = optionalAuth;
// Role-based authorization middleware
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                error: 'Authentication required.',
                message: 'Please log in to access this resource.'
            });
            return;
        }
        const userRole = req.user.role || 'user';
        if (!roles.includes(userRole)) {
            res.status(403).json({
                error: 'Insufficient permissions.',
                message: `This resource requires one of the following roles: ${roles.join(', ')}`
            });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
// Require specific role
exports.requireUser = (0, exports.requireRole)(['user', 'admin']);
exports.requireAdmin = (0, exports.requireRole)(['admin']);
// Rate limiting for authentication endpoints
const authRateLimit = (req, res, next) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 5; // 5 attempts per window
    // Simple in-memory rate limiting for auth endpoints
    if (!req.app.locals.authAttempts) {
        req.app.locals.authAttempts = new Map();
    }
    const attempts = req.app.locals.authAttempts.get(ip) || { count: 0, resetTime: now + windowMs };
    if (now > attempts.resetTime) {
        attempts.count = 1;
        attempts.resetTime = now + windowMs;
    }
    else {
        attempts.count++;
    }
    req.app.locals.authAttempts.set(ip, attempts);
    if (attempts.count > maxAttempts) {
        res.status(429).json({
            error: 'Too many authentication attempts.',
            message: 'Please try again later.',
            retryAfter: Math.ceil((attempts.resetTime - now) / 1000)
        });
        return;
    }
    next();
};
exports.authRateLimit = authRateLimit;
