import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as creditNoteController from '../controllers/creditNoteController.js';

export const creditNoteRoutes = Router();

creditNoteRoutes.get('/', asyncHandler(creditNoteController.list));
creditNoteRoutes.post('/', asyncHandler(creditNoteController.create));
creditNoteRoutes.delete('/:referenceCode', asyncHandler(creditNoteController.remove));
