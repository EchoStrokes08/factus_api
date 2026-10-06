import * as factusAuth from '../api/factusAuthClient.js';
import * as factusPayAuth from '../api/factusPayAuthClient.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

/**
 * Unico lugar que decide CUANDO pedir/refrescar un token. La capa api/
 * solo sabe COMO hacer la llamada HTTP; este modulo decide la politica:
 *   - cache en memoria con margen de expiracion,
 *   - refresh_token antes que un login nuevo,
 *   - una sola peticion de token en vuelo aunque lleguen llamadas en paralelo,
 *   - un reintento transparente si Factus responde 401 (token revocado).
 */

const SAFETY_MARGIN_MS = 30_000;

let factusToken = null; // { accessToken, refreshToken, expiresAt }
let factusTokenInFlight = null;
let factusPayToken = null; // Factus Pay no expira el token
let factusPayTokenInFlight = null;

/** Ejecuta `call(token)` contra Factus, renovando el token una vez si llega un 401. */
export async function withFactusToken(call) {
  const token = await getFactusToken();
  try {
    return await call(token);
  } catch (error) {
    if (error.statusCode !== 401) throw error;
    logger.warn('tokenManager', 'Factus respondio 401: se renueva el token y se reintenta una vez');
    factusToken = null;
    return call(await getFactusToken());
  }
}

/** Igual que withFactusToken, para Factus Pay. */
export async function withFactusPayToken(call) {
  const token = await getFactusPayToken();
  try {
    return await call(token);
  } catch (error) {
    if (error.statusCode !== 401) throw error;
    factusPayToken = null;
    return call(await getFactusPayToken());
  }
}

async function getFactusToken() {
  if (factusToken && Date.now() < factusToken.expiresAt - SAFETY_MARGIN_MS) {
    return factusToken.accessToken;
  }
  factusTokenInFlight ??= requestFactusToken().finally(() => {
    factusTokenInFlight = null;
  });
  return factusTokenInFlight;
}

async function requestFactusToken() {
  if (factusToken?.refreshToken) {
    try {
      factusToken = toFactusTokenState(await factusAuth.refresh(factusToken.refreshToken));
      return factusToken.accessToken;
    } catch (error) {
      logger.warn('tokenManager', 'Fallo el refresh de Factus, se intenta login nuevo', error.message);
    }
  }
  try {
    factusToken = toFactusTokenState(await factusAuth.login());
  } catch (error) {
    throw credentialsError(error, 'Factus', 'FACTUS_CLIENT_ID, FACTUS_CLIENT_SECRET, FACTUS_USERNAME y FACTUS_PASSWORD');
  }
  return factusToken.accessToken;
}

async function getFactusPayToken() {
  if (factusPayToken) return factusPayToken;
  factusPayTokenInFlight ??= factusPayAuth
    .login()
    .catch((error) => {
      throw credentialsError(error, 'Factus Pay', 'FACTUS_PAY_EMAIL y FACTUS_PAY_PASSWORD');
    })
    .then((data) => {
      factusPayToken = data.token ?? data.data?.token;
      return factusPayToken;
    })
    .finally(() => {
      factusPayTokenInFlight = null;
    });
  return factusPayTokenInFlight;
}

/**
 * Un 400/401 al pedir token significa credenciales del SERVIDOR mal
 * configuradas: no es un 401 del usuario de la app, asi que se responde 502
 * con un mensaje que dice que variable revisar.
 */
function credentialsError(error, service, variables) {
  if (![400, 401].includes(error.statusCode)) return error;
  return new ApiError(`${service} rechazó las credenciales del servidor (${error.message}). Revisa ${variables}.`, {
    source: error.source,
    statusCode: 502,
    details: error.details,
  });
}

function toFactusTokenState(data) {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + Number(data.expires_in || 600) * 1000,
  };
}
