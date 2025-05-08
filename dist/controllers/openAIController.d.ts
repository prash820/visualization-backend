import express from "express";
import { Request, Response } from "express";
declare const router: import("express-serve-static-core").Router;
export default router;
export declare const generateVisualization: (req: Request, res: Response) => Promise<express.Response<any, Record<string, any>>>;
export declare const generateIaC: (req: Request, res: Response) => Promise<void>;
