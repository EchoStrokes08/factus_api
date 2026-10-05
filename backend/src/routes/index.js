import { Router } from 'express';
import { env } from '../config/env.js';
import { invoiceRoutes } from './invoiceRoutes.js';
import { creditNoteRoutes } from './creditNoteRoutes.js';
import { agentRoutes } from './agentRoutes.js';

export const apiRouter = Router();

apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', mockMode: env.mockMode });
});

apiRouter.use('/invoices', invoiceRoutes);
apiRouter.use('/credit-notes', creditNoteRoutes);
apiRouter.use('/agent', agentRoutes);
