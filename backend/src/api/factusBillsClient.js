import { env } from '../config/env.js';
import { createHttpClient } from './httpClientFactory.js';
import { ApiError } from '../utils/ApiError.js';
import { mockCreateBill, mockDeleteBill, mockListBills } from './mockData.js';

const SOURCE = 'factus.bills';
const http = createHttpClient(env.factus.baseUrl);

/**
 * Acceso crudo a /v2/bills/* de Factus. Recibe el token ya resuelto
 * (lo entrega tokenManager) y el payload ya validado/armado por
 * invoiceService. Esta funcion no conoce reglas de negocio.
 */

export async function createAndValidateBill(accessToken, payload) {
  if (env.mockMode) return mockCreateBill(payload);

  try {
    const { data } = await http.post('/v2/bills/validate', payload, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data;
  } catch (error) {
    throw ApiError.fromAxiosError(error, SOURCE);
  }
}

export async function deleteBillByReference(accessToken, referenceCode) {
  if (env.mockMode) return mockDeleteBill(referenceCode);

  try {
    const { data } = await http.delete(
      `/v2/bills/destroy/reference/${encodeURIComponent(referenceCode)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return data;
  } catch (error) {
    throw ApiError.fromAxiosError(error, SOURCE);
  }
}

export async function listBills(accessToken, params = {}) {
  if (env.mockMode) return mockListBills();

  try {
    const { data } = await http.get('/v2/bills', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params,
    });
    return data;
  } catch (error) {
    throw ApiError.fromAxiosError(error, SOURCE);
  }
}
