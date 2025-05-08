import { Request, Response, NextFunction } from "express";
declare const asyncHandler: (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => (req: Request, res: Response, next: NextFunction) => Promise<any>;
export default asyncHandler;
