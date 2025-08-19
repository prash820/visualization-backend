import { Request, Response } from "express";

export const calculate = (req: Request, res: Response) => {
  const { expression } = req.body;
  res.json({ result: eval(expression) });
};