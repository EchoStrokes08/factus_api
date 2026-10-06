import { env } from '../config/env.js';
import { createApiClient, segment } from './httpClientFactory.js';
import * as sandbox from './mock/factusSandbox.js';

/** Acceso crudo a /v2/credit-notes de Factus. */

const http = createApiClient(env.factus.baseUrl, 'factus.creditNotes');

const real = {
  /** POST /v2/credit-notes/validate - un reference_code repetido devuelve la existente. */
  createAndValidate: (token, payload) => http.post('/v2/credit-notes/validate', payload, { token }),

  /** GET /v2/credit-notes - acepta filter[reference_code], filter[number], page... */
  list: (token, params) => http.get('/v2/credit-notes', { token, params }),

  /** DELETE /v2/credit-notes/reference/:reference_code - solo si NO esta validada. */
  destroyByReference: (token, referenceCode) =>
    http.delete(`/v2/credit-notes/reference/${segment(referenceCode)}`, { token }),
};

const mock = {
  createAndValidate: async (token, payload) => sandbox.createCreditNote(payload),
  list: async (token, params) => sandbox.listCreditNotes(params),
  destroyByReference: async (token, referenceCode) => sandbox.destroyCreditNote(referenceCode),
};

export const { createAndValidate, list, destroyByReference } = env.mockMode ? mock : real;
