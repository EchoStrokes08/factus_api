/**
 * Unico punto de contacto con nuestro propio backend. El frontend NUNCA
 * llama a Factus/Factus Pay directamente (ni conoce sus URLs o tokens):
 * eso vive del lado del servidor. Si cambia la forma de hablar con el
 * backend (otra base URL, auth de usuario, etc.) solo se toca este archivo.
 */

// En desarrollo apunta a http://localhost:4000 si no se especifica.
// En produccion (Vercel con API unificada) un string vacio usa rutas relativas.
const backendEnv = import.meta.env.VITE_BACKEND_URL;
const BASE_URL = backendEnv !== undefined ? backendEnv : import.meta.env.DEV ? 'http://localhost:4000' : '';

const apiUrl = (path) => `${BASE_URL}/api${path}`;
const segment = (value) => encodeURIComponent(value);

async function request(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(apiUrl(path), {
      method,
      signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw Object.assign(new Error('No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.'), {
      source: 'network',
    });
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(payload?.message || `El servidor respondió ${res.status}`);
    error.source = payload?.source || 'backend';
    error.status = res.status;
    error.details = payload?.details;
    throw error;
  }
  return payload?.data ?? payload;
}

export const backendClient = {
  getHealth: () => request('/health'),
  getNumberingRanges: () => request('/numbering-ranges'),

  // `state` es el estado de la conversacion que devolvio el turno anterior:
  // el backend es serverless y no recuerda nada entre peticiones.
  sendAgentMessage: (sessionId, text, state) =>
    request('/agent/message', { method: 'POST', body: { sessionId, text, state } }),
  endAgentSession: (sessionId) => request(`/agent/session/${segment(sessionId)}`, { method: 'DELETE' }),

  listInvoices: () => request('/invoices'),
  getInvoice: (identifier, { signal } = {}) => request(`/invoices/${segment(identifier)}`, { signal }),
  getCollection: (identifier, { signal } = {}) => request(`/invoices/${segment(identifier)}/collection`, { signal }),
  /** Elimina la factura si no esta validada; si lo esta, la anula con nota credito. */
  cancelInvoice: (identifier) => request(`/invoices/${segment(identifier)}`, { method: 'DELETE' }),
  invoicePdfUrl: (identifier) => apiUrl(`/invoices/${segment(identifier)}/pdf`),

  listCreditNotes: () => request('/credit-notes'),
  deleteCreditNote: (referenceCode) => request(`/credit-notes/${segment(referenceCode)}`, { method: 'DELETE' }),
};
