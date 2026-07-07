import 'dotenv/config';
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';
import app from './app';

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.info(`StoreFlow backend listening on port ${port}`);
    console.info(`Allowed frontend origin: ${process.env.FRONTEND_URL}`);
  });
}

export default app;
