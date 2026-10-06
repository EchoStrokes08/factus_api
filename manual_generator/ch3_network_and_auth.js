import {
  createHeading1,
  createHeading2,
  createHeading3,
  createParagraph,
  createRichParagraph,
  createBullet,
  createCallout,
  createCodeBlock,
  createTable,
  pageBreak,
} from './helpers.js';

export function getChapter3() {
  return [
    pageBreak(),
    createHeading1('CAPÍTULO 3: CAPA DE RED Y AUTENTICACIÓN BACKEND'),
    
    createHeading2('3.1. Fábrica de Clientes HTTP (httpClientFactory.js)'),
    createParagraph('La comunicación con servicios externos está centralizada en `backend/src/api/httpClientFactory.js`. Ningún archivo en toda la aplicación puede importar directamente `axios`, evitando fugas de abstracción y garantizando que cualquier cambio en políticas de red (timeouts, cabeceras, proxies) afecte a un único punto.'),
    
    createCodeBlock(
`export function createApiClient(baseURL, source) {
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

  const auth = (token) => (token ? { Authorization: \`Bearer \${token}\` } : {});

  return {
    get: (url, { token, params } = {}) => send({ method: 'get', url, params, headers: auth(token) }),
    post: (url, body, { token, headers } = {}) =>
      send({ method: 'post', url, data: body, headers: { ...auth(token), ...headers } }),
    delete: (url, { token } = {}) => send({ method: 'delete', url, headers: auth(token) }),
  };
}`, 'JavaScript (httpClientFactory.js)'
    ),

    createParagraph('Aspectos clave de esta fábrica:'),
    createBullet('Cada cliente se instancia con una etiqueta fuente (ej. "factus.bills", "factus.ranges", "factusPay.collections"). Cuando ocurre una excepción, el error sabe con precisión qué subsistema falló.', 'Etiquetado por Source:'),
    createBullet('Se establece un límite estricto de 20.000 ms. Si la DIAN o Factus experimentan una sobrecarga, la petición aborta limpiamente sin colgar indefinidamente el hilo de Node.js.', 'Timeout Preventivo de 20s:'),
    createBullet('La función auxiliar segment() aplica encodeURIComponent a los parámetros de URL para prevenir inyecciones o errores con caracteres especiales en folios y referencias.', 'Sanitización de Segmentos:'),

    createHeading2('3.2. Gestión Avanzada de Tokens OAuth2 (tokenManager.js)'),
    createParagraph('El archivo `backend/src/services/tokenManager.js` implementa uno de los patrones más sofisticados del proyecto. Resuelve cuatro desafíos críticos de la autenticación OAuth2 moderna:'),

    createHeading3('A. Patrón Single-Flight Promise (Prevención de Race Conditions)'),
    createParagraph('Si tres usuarios emiten una factura simultáneamente y el token en memoria ha expirado, una implementación ingenua dispararía tres peticiones concurrentes de autenticación a Factus. Esto saturaría el servidor de auth y podría invalidar tokens previos.'),
    createParagraph('Para impedirlo, se utiliza una promesa compartida en vuelo asignada mediante el operador `??=` (Logical Nullish Assignment):'),
    createCodeBlock(
`let factusTokenInFlight = null;

async function getFactusToken() {
  if (factusToken && Date.now() < factusToken.expiresAt - SAFETY_MARGIN_MS) {
    return factusToken.accessToken;
  }
  factusTokenInFlight ??= requestFactusToken().finally(() => {
    factusTokenInFlight = null;
  });
  return factusTokenInFlight;
}`, 'JavaScript (tokenManager.js)'
    ),
    createParagraph('Cualquier hilo o petición que solicite el token mientras ya hay una solicitud en curso se suscribe a la misma promesa `factusTokenInFlight`. Cuando la promesa se resuelve, todas las peticiones reciben el mismo token y la variable se resetea a `null`.'),

    createHeading3('B. Margen de Seguridad de Expiración (SAFETY_MARGIN_MS)'),
    createParagraph('El token OAuth2 de Factus tiene un tiempo de vida (TTL) delimitado por `expires_in` (generalmente 3.600 segundos). El código define una constante:'),
    createCodeBlock('const SAFETY_MARGIN_MS = 30_000;', 'JavaScript'),
    createParagraph('Esto significa que si al token le restan 30 segundos o menos de vida útil, se considera caducado preventivamente. Esto evita que una factura enviada en el segundo 3599 sea rechazada por la DIAN a mitad de transmisión.'),

    createHeading3('C. Reintento Transparente ante HTTP 401 (Auto-Healing)'),
    createParagraph('Si por cualquier motivo administrativo el token de Factus es revocado en el servidor central antes de su expiración, la siguiente petición fallará con 401 Unauthorized. La función de orden superior `withFactusToken` captura este error, purga el token de la memoria y reintenta la operación una única vez de manera completamente transparente:'),
    createCodeBlock(
`export async function withFactusToken(call) {
  const token = await getFactusToken();
  try {
    return await call(token);
  } catch (error) {
    if (error.statusCode !== 401) throw error;
    logger.warn('tokenManager', 'Factus respondió 401: se renueva el token y se reintenta una vez');
    factusToken = null;
    return call(await getFactusToken());
  }
}`, 'JavaScript (tokenManager.js)'
    ),

    createHeading3('D. Distinción entre Errores de Servidor y de Usuario (Error 502)'),
    createParagraph('Si las credenciales de Factus configuradas en el backend son erróneas, Factus responderá 400 o 401 durante el login. Si el backend propagara ese 401 directamente al frontend, parecería que el cajero o usuario de la web no está autorizado. `tokenManager` captura este fallo y lo transforma en un 502 Bad Gateway con un mensaje explícito:'),
    createCodeBlock(
`function credentialsError(error, service, variables) {
  if (![400, 401].includes(error.statusCode)) return error;
  return new ApiError(\`\${service} rechazó las credenciales del servidor (\${error.message}). Revisa \${variables}.\`, {
    source: error.source,
    statusCode: 502,
  });
}`, 'JavaScript (tokenManager.js)'
    ),

    createHeading2('3.3. Clientes Especializados de Infraestructura'),
    createParagraph('Cada recurso expuesto por Factus cuenta con un cliente dedicado en `backend/src/api/`:'),
    createBullet('Expone createAndValidate(), list(), get(), downloadPdf() y destroyByReference(). Construye las rutas oficiales `/v2/bills`.', 'factusBillsClient.js:'),
    createBullet('Expone validate(), list() y destroyByReference(). Maneja `/v2/credit-notes`.', 'factusCreditNotesClient.js:'),
    createBullet('Consulta `/v2/numbering-ranges` con filtros activos para alimentar el algoritmo de folios.', 'factusNumberingRangesClient.js:'),
    createBullet('Maneja la autenticación y las colecciones de recaudo en `/v1/collections`.', 'factusPayCollectionsClient.js:'),

    createHeading2('3.4. El Simulador en Memoria (mock/factusSandbox.js)'),
    createParagraph('Cuando `MOCK_MODE=true`, las llamadas HTTP no salen a Internet. El módulo `factusSandbox.js` mantiene colecciones en memoria (`Map` y arrays estructurados) simulando el comportamiento íntegro de Factus:'),
    createBullet('Genera folios secuenciales basados en rangos ficticios preconfigurados (prefijo SETP).', 'Simulación de Folios:'),
    createBullet('Calcula CUFEs simulados con el prefijo mock- y timestamps reales.', 'Simulación de CUFE:'),
    createBullet('Si se intenta invocar destroyByReference en una factura que ya tiene CUFE simulado, responde con un HTTP 409 idéntico al rechazo oficial de la DIAN.', 'Cumplimiento Legal Mock:'),
    createBullet('Cuando se abre un recaudo, nace con status started. Tras una espera programada, transiciona a ready incorporando un string en base64 con una imagen SVG/PNG de código QR funcional.', 'Generación Asíncrona de QR:'),
  ];
}
