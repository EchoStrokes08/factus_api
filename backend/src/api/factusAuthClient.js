import { env, assertFactusCredentials } from '../config/env.js';
import { createApiClient } from './httpClientFactory.js';
import * as sandbox from './mock/factusSandbox.js';

/**
 * Acceso puro a POST /oauth/token de Factus (OAuth2 password + refresh).
 * No decide cuando refrescar ni donde guardar el token: eso es tokenManager.
 */

const http = createApiClient(env.factus.baseUrl, 'factus.auth');
const FORM = { 'Content-Type': 'application/x-www-form-urlencoded' };

const real = {
  login() {
    assertFactusCredentials();
    const form = new URLSearchParams({
      grant_type: 'password',
      client_id: env.factus.clientId,
      client_secret: env.factus.clientSecret,
      username: env.factus.username,
      password: env.factus.password,
    });
    return http.post('/oauth/token', form, { headers: FORM });
  },

  refresh(refreshToken) {
    assertFactusCredentials();
    const form = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.factus.clientId,
      client_secret: env.factus.clientSecret,
      refresh_token: refreshToken,
    });
    return http.post('/oauth/token', form, { headers: FORM });
  },
};

const mock = {
  login: async () => sandbox.login(),
  refresh: async () => sandbox.login(),
};

export const { login, refresh } = env.mockMode ? mock : real;
