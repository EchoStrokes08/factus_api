/**
 * Estado conversacional en memoria por sesion (una "llamada" = una sesion).
 * Guarda tanto el historial de mensajes para Anthropic como el "borrador"
 * de factura/nota credito que se va llenando con cada turno. Mantener el
 * borrador aqui (y no en la cabeza del modelo) evita que la IA "olvide"
 * datos ya confirmados en una conversacion larga.
 */

const sessions = new Map();

function emptyDraft() {
  return { customer: {}, items: [], payment: {} };
}

export function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { messages: [], draft: emptyDraft(), history: [] });
  }
  return sessions.get(sessionId);
}

export function resetDraft(session) {
  session.draft = emptyDraft();
}

export function resetSession(sessionId) {
  sessions.delete(sessionId);
}
