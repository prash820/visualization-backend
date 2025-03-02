import { Request, Response, NextFunction } from "express";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err.message);
  res.status(err.statusCode || 500).json({ error: err.message || "Server Error" });
};
