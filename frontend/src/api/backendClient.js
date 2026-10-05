/**
 * Unico punto de contacto con nuestro propio backend. El frontend NUNCA
 * llama a Factus/Factus Pay directamente (ni conoce sus URLs o tokens):
 * eso vive del lado del servidor. Si cambia la forma de hablar con el
 * backend (otra base URL, auth de usuario, etc.) solo se toca este archivo.
 */

// En desarrollo local apunta a http://localhost:4000 si no se especifica.
// En producción (ej. Vercel con API unificada), un string vacío usa rutas relativas (/api/...)
const backendEnv = import.meta.env.VITE_BACKEND_URL;
const BASE_URL = backendEnv !== undefined
  ? backendEnv
  : (import.meta.env.DEV ? 'http://localhost:4000' : '');

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.message || `Error ${res.status} al llamar ${path}`;
    const error = new Error(message);
    error.source = body?.source || 'backend';
    error.details = body?.details;
    throw error;
  }

  return body?.data;
}

export const backendClient = {
  // `state` es el estado de la conversacion que devolvio el turno anterior.
  // El backend es serverless y no recuerda nada entre peticiones.
  sendAgentMessage: (sessionId, text, state) =>
    request('/agent/message', { method: 'POST', body: JSON.stringify({ sessionId, text, state }) }),

  endAgentSession: (sessionId) => request(`/agent/session/${sessionId}`, { method: 'DELETE' }),

  listInvoices: () => request('/invoices'),
  getInvoice: (referenceCode) => request(`/invoices/${encodeURIComponent(referenceCode)}`),
  deleteInvoice: (referenceCode) => request(`/invoices/${encodeURIComponent(referenceCode)}`, { method: 'DELETE' }),

  listCreditNotes: () => request('/credit-notes'),
  deleteCreditNote: (referenceCode) =>
    request(`/credit-notes/${encodeURIComponent(referenceCode)}`, { method: 'DELETE' }),

  getMunicipalities: () => request('/catalogs/municipalities'),
};
