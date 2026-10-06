import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as collectionController from '../controllers/collectionController.js';

export const collectionRoutes = Router();

collectionRoutes.get('/', asyncHandler(collectionController.list));
collectionRoutes.get('/:referenceCode', asyncHandler(collectionController.get));
