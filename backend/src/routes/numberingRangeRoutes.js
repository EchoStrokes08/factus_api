import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as numberingRangeController from '../controllers/numberingRangeController.js';

export const numberingRangeRoutes = Router();

numberingRangeRoutes.get('/', asyncHandler(numberingRangeController.summary));
