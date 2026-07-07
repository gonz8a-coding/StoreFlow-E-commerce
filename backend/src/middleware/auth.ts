import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET ?? 'storeflow_dev_secret';
if (!process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set. Using a development secret. Configure JWT_SECRET in .env for production.');
}

export interface TokenPayload {
  sub: string;
  storeId: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      storeId?: string;
    }
  }
}

export async function authenticateJwt(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers?.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing or invalid authorization header.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Bearer token not found.' });
    }

    const decoded = jwt.verify(token, jwtSecret) as unknown as TokenPayload;
    if (!decoded || !decoded.sub || !decoded.storeId) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Token payload is invalid or missing required fields.' });
    }

    req.userId = decoded.sub;
    req.storeId = decoded.storeId;

    return next();
  } catch (error) {
    console.error('JWT authentication failed:', error);
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired token.' });
  }
}

export {};
