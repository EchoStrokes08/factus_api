import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';
import { getSession, exportSessionState } from './sessionStore.js';
import { toolDefinitions, runTool } from './tools.js';
import { handleFallbackMessage, FALLBACK_GREETING } from './fallbackAgent.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

/**
 * Orquesta la conversacion de voz/texto. Si hay ANTHROPIC_API_KEY, usa
 * Claude con tool-calling (conversacion libre). Si no, usa el agente de
 * respaldo guiado por pasos (fallbackAgent) para que la app siga siendo
 * usable sin esa dependencia externa.
 */

const SYSTEM_PROMPT = `Eres el asistente de voz de un comercio colombiano. Emites, eliminas y anulas facturas electrónicas y notas crédito a través de Factus, ante la DIAN.

Reglas:
- Hablas en español de Colombia, en tono cercano de atención telefónica y con frases cortas: tu respuesta se lee en voz alta.
- Recolectas los datos de uno en uno: primero el cliente (nombre o razón social, cédula o NIT y ciudad), luego los productos o servicios (nombre, precio sin IVA, cantidad) y al final el medio de pago.
- Guarda cada dato con su herramienta apenas el usuario lo diga; no esperes a tenerlo todo.
- Antes de create_invoice o create_credit_note, llama get_draft_summary y lee el resumen para que el usuario confirme.
- Para eliminar o anular una factura usa delete_invoice con el número o la referencia que te den, después de confirmar con el usuario. Explica el resultado tal como lo devuelve la herramienta: si estaba validada por la DIAN, quedó anulada con una nota crédito.
- Si una herramienta devuelve un error, explícalo en palabras simples y propone cómo seguir; no inventes que funcionó.
- Nunca inventes datos de facturación (precios, identificaciones) que el usuario no te haya dado. Si falta un dato obligatorio, pregúntalo.
- Al emitir una factura di su número y el total. No leas enlaces ni URLs: el documento aparece en pantalla.
- Sé breve: una o dos frases por turno.`;

let anthropicClient = null;
function getClient() {
  if (!anthropicClient) anthropicClient = new Anthropic({ apiKey: env.anthropic.apiKey, baseURL: env.anthropic.baseUrl });
  return anthropicClient;
}

// Se activa si Anthropic rechaza la clave: no tiene sentido reintentar
// Claude en cada turno con una configuracion que no va a funcionar.
let claudeRejectedKey = false;

export async function handleAgentMessage(sessionId, userText, clientState) {
  const session = getSession(sessionId, clientState);
  session.createdDocument = null;

  if (!env.anthropic.apiKey || claudeRejectedKey) return fallbackTurn(session, userText);

  const historyLength = session.messages.length;
  session.messages.push({ role: 'user', content: userText || 'Hola' });

  try {
    const finalText = await runAnthropicLoop(session);
    return buildResponse(session, finalText, 'claude');
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      // Clave invalida o sin permisos: la llamada sigue con el asistente
      // guiado en vez de quedar inservible.
      logger.error('agentService', 'Anthropic rechazó ANTHROPIC_API_KEY; se usa el asistente guiado', error.message);
      claudeRejectedKey = true;
      session.messages.length = historyLength;
      return fallbackTurn(session, userText);
    }
    logger.error('agentService', 'Falló la conversación con Claude', error.message);
    throw error instanceof ApiError
      ? error
      : new ApiError('El agente de IA no responde en este momento. Intenta de nuevo en unos segundos.', {
          source: 'agentService',
          statusCode: 502,
        });
  }
}

async function fallbackTurn(session, userText) {
  const reply = userText ? await handleFallbackMessage(session, userText) : FALLBACK_GREETING;
  return buildResponse(session, reply, 'fallback');
}

async function runAnthropicLoop(session) {
  const client = getClient();
  const MAX_TOOL_ROUNDS = 6;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await client.messages.create({
      model: env.anthropic.model,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: session.messages,
      tools: toolDefinitions,
    });

    session.messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason !== 'tool_use') {
      return extractText(response.content) || 'Listo. ¿Seguimos?';
    }

    const toolResults = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      toolResults.push(await executeTool(block, session));
    }

    session.messages.push({ role: 'user', content: toolResults });
  }

  return 'Se me complicó procesar esa solicitud con tantos pasos seguidos. ¿Me la repites de forma más simple?';
}

/**
 * Ejecuta una herramienta y SIEMPRE devuelve un tool_result: si el servicio
 * falla (Factus rechaza, falta un dato), el error vuelve al modelo con
 * is_error para que se lo explique al usuario en vez de romper la llamada.
 */
async function executeTool(block, session) {
  try {
    const result = await runTool(block.name, block.input, session);
    return { type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) };
  } catch (error) {
    logger.warn('agentService', `La herramienta ${block.name} falló`, error.message);
    return { type: 'tool_result', tool_use_id: block.id, content: error.message, is_error: true };
  }
}

function buildResponse(session, reply, engine) {
  return {
    reply,
    engine,
    draft: session.draft,
    // Factura recien creada en este turno (si hubo), para mostrarla en pantalla.
    document: session.createdDocument || null,
    state: exportSessionState(session),
  };
}

function extractText(content) {
  return content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join(' ')
    .trim();
}
