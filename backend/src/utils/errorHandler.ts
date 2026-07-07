import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('Unhandled error:', err);
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (
      err.code === 'P2028' ||
      err.message.includes('does not exist in the current database') ||
      err.message.includes('is_email_verified') ||
      err.message.includes('verification_token')
    ) {
      return res.status(500).json({
        error: 'SCHEMA_MISMATCH',
        message:
          'Database schema mismatch detected. Please run Prisma migrations or update your database schema before retrying.',
      });
    }

    if (err.code === 'P2002') {
      return res.status(409).json({
        error: 'CONFLICT',
        message: 'A record already exists with the same unique value.',
      });
    }
  }

  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'Something went wrong. Please try again later.',
  });
}
