import { env } from '../config/env.js';
import { createApiClient, segment } from './httpClientFactory.js';
import * as sandbox from './mock/factusSandbox.js';

/**
 * Acceso crudo a /v2/bills de Factus. Recibe el token ya resuelto y el
 * payload ya armado: aqui no hay reglas de negocio, solo HTTP.
 * https://developers.factus.com.co/endpoints
 */

const http = createApiClient(env.factus.baseUrl, 'factus.bills');

const real = {
  /** POST /v2/bills/validate - crea, firma y envia a la DIAN en un paso. */
  createAndValidate: (token, payload) => http.post('/v2/bills/validate', payload, { token }),

  /** GET /v2/bills - acepta filter[reference_code], filter[number], page... */
  list: (token, params) => http.get('/v2/bills', { token, params }),

  /** GET /v2/bills/:number - detalle completo (cliente, items, totales, CUFE). */
  get: (token, number) => http.get(`/v2/bills/${segment(number)}`, { token }),

  /** GET /v2/bills/:number/download-pdf - representacion grafica en base64. */
  downloadPdf: (token, number) => http.get(`/v2/bills/${segment(number)}/download-pdf`, { token }),

  /** DELETE /v2/bills/destroy/reference/:reference_code - solo si NO esta validada. */
  destroyByReference: (token, referenceCode) =>
    http.delete(`/v2/bills/destroy/reference/${segment(referenceCode)}`, { token }),
};

const mock = {
  createAndValidate: async (token, payload) => sandbox.createBill(payload),
  list: async (token, params) => sandbox.listBills(params),
  get: async (token, number) => sandbox.getBill(number),
  downloadPdf: async (token, number) => sandbox.downloadBillPdf(number),
  destroyByReference: async (token, referenceCode) => sandbox.destroyBill(referenceCode),
};

export const { createAndValidate, list, get, downloadPdf, destroyByReference } = env.mockMode ? mock : real;
