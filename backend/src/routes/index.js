import { Router } from 'express';
import { env } from '../config/env.js';
import { isEnabled as isFactusPayEnabled } from '../services/collectionService.js';
import { invoiceRoutes } from './invoiceRoutes.js';
import { creditNoteRoutes } from './creditNoteRoutes.js';
import { numberingRangeRoutes } from './numberingRangeRoutes.js';
import { agentRoutes } from './agentRoutes.js';
import { catalogRoutes } from './catalogRoutes.js';

export const apiRouter = Router();

apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mockMode: env.mockMode,
    agentEngine: env.anthropic.apiKey ? 'claude' : 'fallback',
    factusPay: isFactusPayEnabled(),
  });
});

apiRouter.use('/catalogs', catalogRoutes);
apiRouter.use('/numbering-ranges', numberingRangeRoutes);
apiRouter.use('/invoices', invoiceRoutes);
apiRouter.use('/credit-notes', creditNoteRoutes);
apiRouter.use('/agent', agentRoutes);
