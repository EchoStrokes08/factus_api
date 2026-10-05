/**
 * Estado conversacional por sesion (una "llamada" = una sesion).
 * Guarda tanto el historial de mensajes para Anthropic como el "borrador"
 * de factura/nota credito que se va llenando con cada turno. Mantener el
 * borrador aqui (y no en la cabeza del modelo) evita que la IA "olvide"
 * datos ya confirmados en una conversacion larga.
 *
 * En serverless (Vercel) cada peticion puede caer en una instancia distinta
 * y la memoria no se comparte. Por eso el cliente guarda el estado y lo
 * reenvia en cada mensaje (`clientState`); el Map es solo una cache local.
 */

const sessions = new Map();

function emptyDraft() {
  return { customer: {}, items: [], payment: {} };
}

function emptySession() {
  return { messages: [], draft: emptyDraft(), history: [] };
}

export function getSession(sessionId, clientState) {
  if (clientState && typeof clientState === 'object') {
    sessions.set(sessionId, {
      ...emptySession(),
      messages: Array.isArray(clientState.messages) ? clientState.messages : [],
      draft: { ...emptyDraft(), ...clientState.draft },
      flowStep: clientState.flowStep,
      flowData: clientState.flowData,
    });
  } else if (!sessions.has(sessionId)) {
    sessions.set(sessionId, emptySession());
  }
  return sessions.get(sessionId);
}

/** Lo que el cliente debe guardar y reenviar en el siguiente mensaje. */
export function exportSessionState(session) {
  return {
    messages: session.messages,
    draft: session.draft,
    flowStep: session.flowStep,
    flowData: session.flowData,
  };
}

export function resetDraft(session) {
  session.draft = emptyDraft();
}

export function resetSession(sessionId) {
  sessions.delete(sessionId);
}
