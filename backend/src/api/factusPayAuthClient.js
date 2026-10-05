import { env, assertFactusPayCredentials } from '../config/env.js';
import { createHttpClient } from './httpClientFactory.js';
import { ApiError } from '../utils/ApiError.js';
import { mockPayLogin } from './mockData.js';

const SOURCE = 'factusPay.auth';
const http = createHttpClient(env.factusPay.baseUrl);

export async function login() {
  if (env.mockMode) return mockPayLogin();

  assertFactusPayCredentials();
  try {
    const { data } = await http.post(
      '/auth',
      { email: env.factusPay.email, password: env.factusPay.password },
      { headers: { 'Content-Type': 'application/json' } },
    );
    return data;
  } catch (error) {
    throw ApiError.fromAxiosError(error, SOURCE);
  }
}
