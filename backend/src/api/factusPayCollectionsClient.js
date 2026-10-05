import { env } from '../config/env.js';
import { createHttpClient } from './httpClientFactory.js';
import { ApiError } from '../utils/ApiError.js';
import { mockCreateCollection } from './mockData.js';

const SOURCE = 'factusPay.collections';
const http = createHttpClient(env.factusPay.baseUrl);

/**
 * Acceso crudo a /v1/collections de Factus Pay. Cada factura creada en
 * Factus genera aqui un "recaudo" con el mismo reference_code, que es como
 * la plata termina siendo cobrable en pay-api-sandbox.factus.com.co/collections.
 */
export async function createCollection(token, { reference_code, amount }) {
  if (env.mockMode) return mockCreateCollection({ reference_code, amount });

  try {
    const { data } = await http.post(
      '/v1/collections',
      { reference_code, amount },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return data;
  } catch (error) {
    throw ApiError.fromAxiosError(error, SOURCE);
  }
}
