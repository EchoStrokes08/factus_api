import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import * as invoiceController from '../controllers/invoiceController.js';

export const invoiceRoutes = Router();

// :identifier acepta el codigo de referencia (FACT-...) o el numero DIAN (SETP...).
invoiceRoutes.get('/', asyncHandler(invoiceController.list));
invoiceRoutes.post('/', asyncHandler(invoiceController.create));
invoiceRoutes.get('/:identifier', asyncHandler(invoiceController.get));
invoiceRoutes.get('/:identifier/collection', asyncHandler(invoiceController.collection));
invoiceRoutes.get('/:identifier/pdf', asyncHandler(invoiceController.pdf));
invoiceRoutes.delete('/:identifier', asyncHandler(invoiceController.cancel));
