import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as invoiceController from '../controllers/invoiceController.js';

export const invoiceRoutes = Router();

invoiceRoutes.get('/', asyncHandler(invoiceController.list));
invoiceRoutes.get('/:referenceCode', asyncHandler(invoiceController.get));
invoiceRoutes.post('/', asyncHandler(invoiceController.create));
invoiceRoutes.delete('/:referenceCode', asyncHandler(invoiceController.remove));
