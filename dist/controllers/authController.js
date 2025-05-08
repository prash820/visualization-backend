"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateToken = exports.loginUser = exports.registerUser = void 0;
const express_1 = __importDefault(require("express"));
const User_1 = __importDefault(require("../models/User"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const router = express_1.default.Router();
exports.default = router;
const registerUser = async (req, res) => {
    const { email, password } = req.body;
    const existingUser = await User_1.default.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ error: "Email already in use." });
    }
    const newUser = new User_1.default({ email, password });
    await newUser.save();
    return res.status(201).json({ message: "User registered successfully!" });
};
exports.registerUser = registerUser;
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User_1.default.findOne({ email });
        if (!user) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "24h" });
        res.json({ token, user: { id: user._id, email: user.email } });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.loginUser = loginUser;
const validateToken = async (req, res) => {
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
};
exports.validateToken = validateToken;
//# sourceMappingURL=authController.js.map