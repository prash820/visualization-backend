import { Request, Response } from "express";
declare const router: import("express-serve-static-core").Router;
export default router;
export declare const createProject: (req: Request, res: Response) => Promise<void>;
export declare const getProjects: (req: Request, res: Response) => Promise<void>;
export declare const updateProject: (req: Request, res: Response) => Promise<void>;
export declare const deleteProject: (req: Request, res: Response) => Promise<void>;
export declare const saveProjectState: (req: Request, res: Response) => Promise<void>;
export declare const getProjectById: (req: Request, res: Response) => Promise<void>;
