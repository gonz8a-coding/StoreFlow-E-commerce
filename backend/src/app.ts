import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { json, raw } from 'body-parser';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { productRouter } from './routes/product';
import { publicRouter } from './routes/public';
import { checkoutRouter } from './routes/checkout';
import { webhookRouter } from './routes/webhooks';
import { errorHandler } from './utils/errorHandler';

const app = express();
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const corsOrigins = frontendUrl
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .flatMap((origin) => {
    const variants = [origin];
    if (origin.includes('localhost')) {
      variants.push(origin.replace('localhost', '127.0.0.1'));
    }
    return variants;
  });
const normalizedCorsOrigins = new Set([...corsOrigins, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000']);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'Too many authentication attempts, please try again later.' },
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "http://localhost:5173", "http://localhost:4000"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
  })
);
app.use(morgan('combined'));
app.get(['/', '/health', '/login'], (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'StoreFlow API',
    message: 'Backend is running.',
    endpoints: {
      auth: '/api/auth/login',
      public: '/api/public/stores',
      products: '/api/products',
    },
  });
});
app.use(cors({
  origin: (requestOrigin, callback) => {
    if (!requestOrigin) {
      callback(null, true);
      return;
    }

    if (normalizedCorsOrigins.has(requestOrigin) || requestOrigin.endsWith('.vercel.app')) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(json());

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/public', publicRouter);
app.use('/api/admin', adminRouter);
app.use('/api/products', productRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/webhooks/stripe', raw({ type: 'application/json' }), webhookRouter);

app.use(errorHandler);

export default app;
