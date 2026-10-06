import { env, assertFactusPayCredentials } from '../config/env.js';
import { createApiClient } from './httpClientFactory.js';
import * as sandbox from './mock/factusSandbox.js';

/** Acceso puro a POST /auth de Factus Pay (token Bearer sin expiracion). */

const http = createApiClient(env.factusPay.baseUrl, 'factusPay.auth');

const real = {
  login() {
    assertFactusPayCredentials();
    return http.post('/auth', { email: env.factusPay.email, password: env.factusPay.password });
  },
};

const mock = {
  login: async () => sandbox.payLogin(),
};

export const { login } = env.factusPay.mockMode ? mock : real;
