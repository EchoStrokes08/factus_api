import { env } from '../config/env.js';
import { createApiClient, segment } from './httpClientFactory.js';
import * as sandbox from './mock/factusSandbox.js';

/**
 * Acceso crudo a /v1/collections de Factus Pay. Cada factura emitida abre
 * aqui un "recaudo" con el mismo reference_code; Factus Pay genera el QR de
 * cobro de forma asincrona (status started -> ready -> paid).
 * https://pay-developers.factus.com.co
 */

const http = createApiClient(env.factusPay.baseUrl, 'factusPay.collections');

const real = {
  /** POST /v1/collections - idempotente por reference_code. */
  create: (token, { reference_code, amount }) => http.post('/v1/collections', { reference_code, amount }, { token }),

  /** GET /v1/collections/:referenceCode - estado y QR (data URI base64). */
  get: (token, referenceCode) => http.get(`/v1/collections/${segment(referenceCode)}`, { token }),

  /** GET /v1/collections - acepta status, reference_code y page; no incluye el QR. */
  list: (token, params) => http.get('/v1/collections', { token, params }),
};

const mock = {
  create: async (token, body) => sandbox.createCollection(body),
  get: async (token, referenceCode) => sandbox.getCollection(referenceCode),
  list: async (token, params) => sandbox.listCollections(params),
};

export const { create, get, list } = env.factusPay.mockMode ? mock : real;
