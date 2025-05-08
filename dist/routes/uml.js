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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const umlController_1 = require("../controllers/umlController");
const router = (0, express_1.Router)();
// Middleware to handle authentication
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }
    try {
        // Verify token here
        next();
    }
    catch (error) {
        res.status(403).json({ error: 'Invalid token' });
        return;
    }
};
// Generate UML diagrams from a prompt
router.post('/generate', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, umlController_1.generateUmlDiagrams)(req, res);
}));
// Save a UML diagram
router.post('/save', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, umlController_1.saveUmlDiagram)(req, res);
}));
// Get a UML diagram
router.get('/:id', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, umlController_1.getUmlDiagram)(req, res);
}));
// Update a UML diagram
router.put('/:id', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, umlController_1.updateUmlDiagram)(req, res);
}));
// Delete a UML diagram
router.delete('/:id', authMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, umlController_1.deleteUmlDiagram)(req, res);
}));
exports.default = router;
