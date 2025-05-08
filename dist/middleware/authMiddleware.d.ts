import { Request, Response, NextFunction } from "express";
import { IUser } from "../models/User";
interface AuthRequest extends Request {
    user?: IUser;
}
export declare const authenticateToken: (req: AuthRequest, res: Response, next: NextFunction) => void;
export {};
