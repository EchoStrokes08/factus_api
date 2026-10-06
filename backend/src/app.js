import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export const app = express();

// FRONTEND_ORIGIN admite una lista separada por comas o "*". En Vercel el
// frontend y la API comparten dominio, asi que alli CORS ni interviene.
const allowedOrigins = env.frontendOrigin.split(',').map((origin) => origin.trim()).filter(Boolean);
const isLocalhost = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

app.disable('x-powered-by');
app.use(
  cors({
    origin(origin, callback) {
      const allowed = !origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin) || isLocalhost(origin);
      callback(null, allowed);
    },
  }),
);
// El agente reenvia su historial de conversacion en cada mensaje.
app.use(express.json({ limit: '1mb' }));

app.use('/api', apiRouter);
// Por compatibilidad si la funcion serverless de Vercel recibe la ruta sin /api.
app.use(apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
