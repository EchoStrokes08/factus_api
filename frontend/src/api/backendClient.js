/**
 * Unico punto de contacto con nuestro propio backend. El frontend NUNCA
 * llama a Factus/Factus Pay directamente (ni conoce sus URLs o tokens):
 * eso vive del lado del servidor. Si cambia la forma de hablar con el
 * backend (otra base URL, auth de usuario, etc.) solo se toca este archivo.
 */

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

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
  sendAgentMessage: (sessionId, text) =>
    request('/agent/message', { method: 'POST', body: JSON.stringify({ sessionId, text }) }),

  endAgentSession: (sessionId) => request(`/agent/session/${sessionId}`, { method: 'DELETE' }),

  listInvoices: () => request('/invoices'),
  deleteInvoice: (referenceCode) => request(`/invoices/${encodeURIComponent(referenceCode)}`, { method: 'DELETE' }),

  listCreditNotes: () => request('/credit-notes'),
  deleteCreditNote: (referenceCode) =>
    request(`/credit-notes/${encodeURIComponent(referenceCode)}`, { method: 'DELETE' }),
};
