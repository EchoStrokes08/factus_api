import axios from 'axios';

/**
 * Unica fabrica de clientes axios de esta capa. Nada fuera de `api/` deberia
 * importar axios directamente: si Factus cambia su transporte o hay que
 * añadir retries/timeouts, este es el unico archivo que cambia.
 */
export function createHttpClient(baseURL) {
  return axios.create({
    baseURL,
    timeout: 15000,
    headers: {
      Accept: 'application/json',
    },
  });
}
