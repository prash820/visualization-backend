import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { IUser } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export type { Request, Response, NextFunction, RequestHandler };

export interface AuthRequest extends Request {
  user?: IUser;
}

export type TypedRequest<T = any> = Request & {
  body: T;
};

export type TypedResponse<T = any> = Response & {
  json: (body: T) => TypedResponse<T>;
};

