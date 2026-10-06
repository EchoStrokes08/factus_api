import { env } from '../config/env.js';
import { createApiClient } from './httpClientFactory.js';
import * as sandbox from './mock/factusSandbox.js';

/**
 * Acceso crudo a GET /v2/numbering-ranges de Factus.
 * Filtros documentados: filter[id], filter[document], filter[resolution_number],
 * filter[technical_key], filter[is_active] (1/0), filter[trashed].
 */

const http = createApiClient(env.factus.baseUrl, 'factus.numberingRanges');

const real = {
  list: (token, params) => http.get('/v2/numbering-ranges', { token, params }),
};

const mock = {
  list: async (token, params) => sandbox.listNumberingRanges(params),
};

export const { list } = env.mockMode ? mock : real;
