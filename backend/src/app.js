import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export const app = express();

const allowedOriginSetting = env.frontendOrigin || '*';
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOriginSetting === '*' ||
        origin === allowedOriginSetting ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost')
      ) {
        return callback(null, true);
      }
      const allowedList = allowedOriginSetting.split(',').map((o) => o.trim());
      if (allowedList.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permitir por defecto para facilitar despliegues
    },
    credentials: true,
  }),
);
app.use(express.json());

app.use('/api', apiRouter);
// Por compatibilidad si la función serverless en Vercel recibe la ruta sin /api
app.use(apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
