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
exports.validateToken = exports.loginUser = exports.registerUser = void 0;
// src/controllers/authController.ts
const express_1 = __importDefault(require("express"));
const User_1 = __importDefault(require("../models/User"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const router = express_1.default.Router();
exports.default = router;
// Register User
const registerUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    const existingUser = yield User_1.default.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ error: "Email already in use." });
    }
    const newUser = new User_1.default({ email, password });
    yield newUser.save();
    return res.status(201).json({ message: "User registered successfully!" });
});
exports.registerUser = registerUser;
// Login User
const loginUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        // Check if user exists
        const user = yield User_1.default.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password." });
        }
        // Compare passwords
        const isMatch = yield user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password." });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
            expiresIn: "1h", // Token expiry time
        });
        res.status(200).json({ token, message: "Login successful!" });
    }
    catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ error: "Server error. Please try again later." });
    }
});
exports.loginUser = loginUser;
// Validate Token
const validateToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
    if (!token)
        return res.status(401).json({ error: "No token provided." });
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "secret");
        return res.status(200).json({ message: "Token is valid!", decoded });
    }
    catch (error) {
        return res.status(401).json({ error: "Invalid token." });
    }
});
exports.validateToken = validateToken;
