import { Router } from 'express';
import * as catalogController from '../controllers/catalogController.js';

export const catalogRoutes = Router();

catalogRoutes.get('/municipalities', catalogController.getMunicipalities);
catalogRoutes.get('/', catalogController.getCatalogs);
