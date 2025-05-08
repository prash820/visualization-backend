import express, { RequestHandler } from "express";
import { generateUmlDiagrams } from "../controllers/umlController";
import { generateArchitectureDiagram } from "../controllers/architectureController";

const router = express.Router();

// UML diagram routes
router.post("/uml/generate", generateUmlDiagrams as RequestHandler);

// Architecture diagram routes
router.post("/architecture/generate", generateArchitectureDiagram as RequestHandler);

export default router; 