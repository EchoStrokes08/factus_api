import { env, assertFactusCredentials } from '../config/env.js';
import { createHttpClient } from './httpClientFactory.js';
import { ApiError } from '../utils/ApiError.js';
import { mockLogin } from './mockData.js';

const SOURCE = 'factus.auth';
const http = createHttpClient(env.factus.baseUrl);

/**
 * Capa de acceso pura: solo sabe hablar HTTP con /oauth/token de Factus.
 * No decide cuando refrescar ni donde guardar el token (eso es tokenManager,
 * en services/).
 */

export async function login() {
  if (env.mockMode) return mockLogin();

  assertFactusCredentials();
  const form = new URLSearchParams({
    grant_type: 'password',
    client_id: env.factus.clientId,
    client_secret: env.factus.clientSecret,
    username: env.factus.username,
    password: env.factus.password,
  });

  try {
    const { data } = await http.post('/oauth/token', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data;
  } catch (error) {
    throw ApiError.fromAxiosError(error, SOURCE);
  }
}

export async function refresh(refreshToken) {
  if (env.mockMode) return mockLogin();

  assertFactusCredentials();
  const form = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: env.factus.clientId,
    client_secret: env.factus.clientSecret,
    refresh_token: refreshToken,
  });

  try {
    const { data } = await http.post('/oauth/token', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data;
  } catch (error) {
    throw ApiError.fromAxiosError(error, SOURCE);
  }
}
