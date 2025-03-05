"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    console.error("Error:", err.message);
    res.status(err.statusCode || 500).json({ error: err.message || "Server Error" });
};
exports.errorHandler = errorHandler;
