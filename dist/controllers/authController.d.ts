import express from "express";
import { Request, Response } from "express";
declare const router: import("express-serve-static-core").Router;
export default router;
export declare const registerUser: (req: Request, res: Response) => Promise<express.Response<any, Record<string, any>>>;
export declare const loginUser: (req: Request, res: Response) => Promise<void>;
export declare const validateToken: (req: Request, res: Response) => Promise<express.Response<any, Record<string, any>>>;
