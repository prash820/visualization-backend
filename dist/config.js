"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Configuration = void 0;
exports.Configuration = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/visualization',
    PORT: process.env.PORT || 3000,
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
};
