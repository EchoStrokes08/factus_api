import * as factusAuth from '../api/factusAuthClient.js';
import * as factusPayAuth from '../api/factusPayAuthClient.js';
import { logger } from '../utils/logger.js';

/**
 * Unico lugar que decide CUANDO pedir/refrescar un token. La capa api/
 * solo sabe COMO hacer la llamada HTTP; este modulo decide la politica
 * (cache en memoria, margen de expiracion, refresh vs login nuevo).
 */

const SAFETY_MARGIN_MS = 30_000;

let factusToken = null; // { accessToken, refreshToken, expiresAt }
let factusPayToken = null; // { token } (Factus Pay no expira)

export async function getFactusToken() {
  const now = Date.now();

  if (factusToken && now < factusToken.expiresAt - SAFETY_MARGIN_MS) {
    return factusToken.accessToken;
  }

  if (factusToken?.refreshToken) {
    try {
      const data = await factusAuth.refresh(factusToken.refreshToken);
      factusToken = toFactusTokenState(data);
      return factusToken.accessToken;
    } catch (error) {
      logger.warn('tokenManager', 'Fallo el refresh de Factus, se intenta login nuevo', error.message);
    }
  }

  const data = await factusAuth.login();
  factusToken = toFactusTokenState(data);
  return factusToken.accessToken;
}

export async function getFactusPayToken() {
  if (factusPayToken?.token) return factusPayToken.token;

  const data = await factusPayAuth.login();
  factusPayToken = { token: data.token };
  return factusPayToken.token;
}

export function invalidateFactusToken() {
  factusToken = null;
}

export function invalidateFactusPayToken() {
  factusPayToken = null;
}

function toFactusTokenState(data) {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + Number(data.expires_in || 600) * 1000,
  };
}
