"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
// import { IUser } from '../models/User'; // Removed
dotenv_1.default.config();
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'Access denied. No token provided.' });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        // Create a minimal user object with the required fields
        const user = {
            _id: decoded.id,
            email: decoded.email
        };
        req.user = user;
        next();
    }
    catch (error) {
        res.status(403).json({ error: 'Invalid token.' });
    }
};
exports.authenticateToken = authenticateToken;
