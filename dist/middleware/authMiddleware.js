"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importStar(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User")); // ✅ Import IUser from the User model
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// ✅ Fix TypeScript Issue: Middleware should return `void`
const authenticateToken = (req, res, next) => {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
    if (!token) {
        res.status(401).json({ error: "Access denied. No token provided." });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (!(decoded === null || decoded === void 0 ? void 0 : decoded.id)) {
            res.status(403).json({ error: "Invalid token." });
            return;
        }
        // ✅ Fix: Retrieve the full `IUser` object
        User_1.default.findById(decoded.id).then((user) => {
            if (!user) {
                res.status(404).json({ error: "User not found." });
                return;
            }
            req.user = user; // ✅ Now req.user is correctly typed as `IUser`
            next();
        }).catch((err) => {
            console.error("Database error:", err);
            res.status(500).json({ error: "Database error. Please try again later." });
        });
    }
    catch (error) {
        console.error("Token verification failed:", error);
        if (error instanceof jsonwebtoken_1.TokenExpiredError) {
            res.status(401).json({ error: "Token expired. Please log in again." });
        }
        else {
            res.status(403).json({ error: "Invalid token." });
        }
    }
};
exports.authenticateToken = authenticateToken;
