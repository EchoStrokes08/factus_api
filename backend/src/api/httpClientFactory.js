import axios from 'axios';
import { ApiError } from '../utils/ApiError.js';

/**
 * Unica fabrica de clientes HTTP de esta capa. Nada fuera de `api/` deberia
 * importar axios directamente: si Factus cambia su transporte o hay que
 * añadir retries/timeouts, este es el unico archivo que cambia.
 *
 * Cada cliente queda "etiquetado" con un `source` (factus.bills,
 * factusPay.collections...) para que cualquier fallo llegue al errorHandler
 * como un ApiError que dice exactamente que integracion fallo.
 */
export function createApiClient(baseURL, source) {
  const http = axios.create({
    baseURL,
    timeout: 20000,
    headers: { Accept: 'application/json' },
  });

  async function send(config) {
    try {
      const { data } = await http.request(config);
      return data;
    } catch (error) {
      throw ApiError.fromAxiosError(error, source);
    }
  }

  const auth = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

  return {
    get: (url, { token, params } = {}) => send({ method: 'get', url, params, headers: auth(token) }),
    post: (url, body, { token, headers } = {}) =>
      send({ method: 'post', url, data: body, headers: { ...auth(token), ...headers } }),
    delete: (url, { token } = {}) => send({ method: 'delete', url, headers: auth(token) }),
  };
}

/** Codifica un segmento de ruta (referencias y numeros vienen del usuario). */
export const segment = (value) => encodeURIComponent(String(value));
