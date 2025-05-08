"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const umlController_1 = require("../controllers/umlController");
const router = (0, express_1.Router)();
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }
    try {
        next();
    }
    catch (error) {
        res.status(403).json({ error: 'Invalid token' });
        return;
    }
};
router.post('/generate', authMiddleware, async (req, res) => {
    await (0, umlController_1.generateUmlDiagrams)(req, res);
});
router.post('/save', authMiddleware, async (req, res) => {
    await (0, umlController_1.saveUmlDiagram)(req, res);
});
router.get('/:id', authMiddleware, async (req, res) => {
    await (0, umlController_1.getUmlDiagram)(req, res);
});
router.put('/:id', authMiddleware, async (req, res) => {
    await (0, umlController_1.updateUmlDiagram)(req, res);
});
router.delete('/:id', authMiddleware, async (req, res) => {
    await (0, umlController_1.deleteUmlDiagram)(req, res);
});
exports.default = router;
//# sourceMappingURL=uml.js.map