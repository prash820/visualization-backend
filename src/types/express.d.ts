import type { Request, Response, NextFunction, Router, RequestHandler } from 'express';
import type { IUser } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export { Router, RequestHandler };
export type { Request, Response, NextFunction };

export interface AuthRequest extends Request {
  user?: IUser;
}

export type TypedRequest<T = any> = Request & {
  body: T;
};

export type TypedResponse<T = any> = Response & {
  json: (body: T) => TypedResponse<T>;
};

