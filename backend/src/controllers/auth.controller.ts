import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { prisma } from '../prisma';

const jwtSecret = process.env.JWT_SECRET ?? 'storeflow_dev_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';

if (!process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set. Using a development secret. Configure JWT_SECRET in .env for production.');
}

function slugifyStoreName(storeName: string) {
  return storeName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function generateUniqueStoreSlug(storeName: string) {
  const baseSlug = slugifyStoreName(storeName);
  let slug = baseSlug;
  let counter = 0;

  while (true) {
    const existing = await prisma.store.findUnique({ where: { store_slug: slug } });
    if (!existing) {
      return slug;
    }
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
}

export async function registerStore(req: Request, res: Response, next: NextFunction) {
  try {
    const { ownerName, email, password, storeName } = req.body as {
      ownerName: string;
      email: string;
      password: string;
      storeName: string;
    };

    if (!ownerName || !email || !password || !storeName) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'All registration fields are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);
    const storeSlug = await generateUniqueStoreSlug(storeName);

    const existingOwner = await prisma.customer.findUnique({ where: { email: normalizedEmail } });
    if (existingOwner) {
      return res.status(409).json({ error: 'CONFLICT', message: 'Oops… looks like this email is already registered.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const transactionResult = await prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: {
          store_name: storeName,
          store_slug: storeSlug,
        },
      });

      const owner = await tx.customer.create({
        data: {
          store_id: store.id,
          name: ownerName,
          email: normalizedEmail,
          password_hash: passwordHash,
          is_email_verified: false,
          verification_token: verificationToken,
        },
      });

      return { store, owner, verificationToken };
    });

    const signOptions = {
      subject: transactionResult.owner.id,
      expiresIn: JWT_EXPIRES_IN,
    } as any;

    const token = jwt.sign(
      {
        userId: transactionResult.owner.id,
        storeId: transactionResult.store.id,
      },
      jwtSecret as Secret,
      signOptions
    );

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const verificationUrl = `${frontendUrl}/verify-email?token=${transactionResult.verificationToken}`;

    return res.status(201).json({
      success: true,
      token,
      verificationUrl,
      store: {
        id: transactionResult.store.id,
        storeName: transactionResult.store.store_name,
        storeSlug: transactionResult.store.store_slug,
      },
      user: {
        id: transactionResult.owner.id,
        name: transactionResult.owner.name,
        email: transactionResult.owner.email,
        isEmailVerified: transactionResult.owner.is_email_verified,
      },
    });
  } catch (error) {
    console.error('Store registration failed:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002' && error.meta && typeof error.meta === 'object') {
        const target = (error.meta as { target?: string[] }).target?.join(', ') ?? '';
        if (target.includes('email')) {
          return res.status(409).json({ error: 'CONFLICT', message: 'Oops… looks like this email is already registered.' });
        }
        return res.status(409).json({ error: 'CONFLICT', message: 'Email or store slug already exists.' });
      }

      if (error.code === 'P2028' || error.message.includes('is_email_verified')) {
        return res.status(500).json({
          error: 'SCHEMA_MISMATCH',
          message: 'Oops… the backend database schema is not up to date. Please run migrations before retrying.',
        });
      }
    }

    return next(error);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const token = (req.query.token as string | undefined)?.trim();
    if (!token) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Verification token is required.' });
    }

    const owner = await prisma.customer.findUnique({ where: { verification_token: token } });
    if (!owner) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Verification token is invalid or expired.' });
    }

    const updatedOwner = await prisma.customer.update({
      where: { id: owner.id },
      data: { is_email_verified: true, verification_token: null },
    });

    return res.status(200).json({
      success: true,
      message: 'Email verification completed successfully.',
      user: {
        id: updatedOwner.id,
        email: updatedOwner.email,
        isEmailVerified: updatedOwner.is_email_verified,
      },
    });
  } catch (error) {
    console.error('Email verification failed:', error);
    return next(error);
  }
}

export async function loginStore(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body as {
      email: string;
      password: string;
    };

    if (!email || !password) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const owner = await prisma.customer.findUnique({ where: { email: normalizedEmail } });

    if (!owner) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid credentials.' });
    }

    const passwordValid = await bcrypt.compare(password, owner.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid credentials.' });
    }

    const store = await prisma.store.findUnique({ where: { id: owner.store_id } });
    if (!store) {
      return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Associated store not found.' });
    }

    const signOptions = {
      subject: owner.id,
      expiresIn: JWT_EXPIRES_IN,
    } as any;

    const token = jwt.sign(
      {
        userId: owner.id,
        storeId: owner.store_id,
      },
      jwtSecret as Secret,
      signOptions
    );

    return res.status(200).json({
      success: true,
      token,
      store: {
        id: store.id,
        storeName: store.store_name,
        storeSlug: store.store_slug,
      },
      user: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        isEmailVerified: owner.is_email_verified,
      },
    });
  } catch (error) {
    console.error('Store login failed:', error);
    return next(error);
  }
}
