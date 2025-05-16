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
exports.validateToken = exports.login = exports.register = void 0;
const express_1 = __importDefault(require("express"));
// import User from "../models/User"; // Removed
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const userFileStore_1 = require("../utils/userFileStore");
dotenv_1.default.config();
const router = express_1.default.Router();
exports.default = router;
// Register User
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        const user = yield (0, userFileStore_1.createUser)(email, password);
        res.json({ message: "User registered", user: { _id: user._id, email: user.email } });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
exports.register = register;
// Login User
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    const user = yield (0, userFileStore_1.validateUser)(email, password);
    if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || "secret", { expiresIn: "7d" });
    res.json({ token, user: { _id: user._id, email: user.email } });
});
exports.login = login;
// Validate Token
const validateToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
    if (!token) {
        res.status(401).json({ error: "No token provided." });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "secret");
        res.status(200).json({ message: "Token is valid!", decoded });
    }
    catch (error) {
        res.status(401).json({ error: "Invalid token." });
    }
});
exports.validateToken = validateToken;
