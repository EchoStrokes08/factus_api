import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as agentController from '../controllers/agentController.js';

export const agentRoutes = Router();

agentRoutes.post('/message', asyncHandler(agentController.sendMessage));
agentRoutes.delete('/session/:sessionId', asyncHandler(agentController.endSession));
