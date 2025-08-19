"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.getProfile = exports.validateToken = exports.login = exports.register = void 0;
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const dotenv_1 = __importDefault(require("dotenv"));
const databaseService_1 = require("../services/databaseService");
dotenv_1.default.config();
const router = express_1.default.Router();
exports.default = router;
// Register User
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password, name } = req.body;
    try {
        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required"
            });
        }
        if (password.length < 8) {
            return res.status(400).json({
                error: "Password must be at least 8 characters long"
            });
        }
        // Check if user already exists
        const existingUser = databaseService_1.databaseService.getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({
                error: "User with this email already exists"
            });
        }
        // Hash password
        const saltRounds = 12;
        const passwordHash = yield bcrypt_1.default.hash(password, saltRounds);
        // Create user
        const user = {
            id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            email: email.toLowerCase().trim(),
            passwordHash,
            name: name || email.split('@')[0],
            role: 'user',
            createdAt: new Date().toISOString()
        };
        databaseService_1.databaseService.saveUser(user);
        // Generate token
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            role: user.role
        }, process.env.JWT_SECRET || "secret", { expiresIn: "7d" });
        res.status(201).json({
            message: "User registered successfully",
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    }
    catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({
            error: "Failed to register user. Please try again."
        });
    }
});
exports.register = register;
// Login User
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required"
            });
        }
        // Find user
        const user = databaseService_1.databaseService.getUserByEmail(email.toLowerCase().trim());
        console.log('[login] User lookup result:', user ? { id: user.id, email: user.email, hasPasswordHash: !!user.passwordHash } : 'Not found');
        if (!user) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }
        // Verify password
        console.log('[login] Attempting password verification for:', email);
        console.log('[login] Password hash from DB:', user.passwordHash ? user.passwordHash.substring(0, 20) + '...' : 'null');
        const isValidPassword = yield bcrypt_1.default.compare(password, user.passwordHash);
        console.log('[login] Password verification result:', isValidPassword);
        if (!isValidPassword) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }
        // Generate token
        const jwtSecret = process.env.JWT_SECRET || "secret";
        console.log('[login] Using JWT_SECRET:', jwtSecret);
        console.log('[login] User data for token:', { id: user.id, email: user.email, role: user.role || 'user' });
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            email: user.email,
            role: user.role || 'user'
        }, jwtSecret, { expiresIn: "7d" });
        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name || user.email.split('@')[0],
                role: user.role || 'user'
            }
        });
    }
    catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            error: "Failed to authenticate. Please try again."
        });
    }
});
exports.login = login;
// Validate Token
const validateToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
    if (!token) {
        res.status(401).json({
            error: "No token provided.",
            message: "Please log in to access this resource."
        });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "secret");
        // Get user from database to ensure they still exist
        const user = databaseService_1.databaseService.getUserByEmail(decoded.email);
        if (!user) {
            res.status(401).json({
                error: "User not found.",
                message: "Please log in again."
            });
            return;
        }
        res.status(200).json({
            message: "Token is valid!",
            user: {
                id: user.id,
                email: user.email,
                name: user.name || user.email.split('@')[0],
                role: user.role || 'user'
            }
        });
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({
                error: "Token expired.",
                message: "Please log in again."
            });
        }
        else {
            res.status(401).json({
                error: "Invalid token.",
                message: "Please log in again."
            });
        }
    }
});
exports.validateToken = validateToken;
// Get current user profile
const getProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({
                error: "Not authenticated.",
                message: "Please log in to access your profile."
            });
            return;
        }
        const dbUser = databaseService_1.databaseService.getUserByEmail(user.email);
        if (!dbUser) {
            res.status(404).json({
                error: "User not found.",
                message: "Please log in again."
            });
            return;
        }
        res.json({
            user: {
                id: dbUser.id,
                email: dbUser.email,
                name: dbUser.name || dbUser.email.split('@')[0],
                role: dbUser.role || 'user',
                createdAt: dbUser.createdAt
            }
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            error: "Failed to get profile."
        });
    }
});
exports.getProfile = getProfile;
// Logout (client-side token removal)
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json({
        message: "Logged out successfully. Please remove the token from your client."
    });
});
exports.logout = logout;
