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

const SYSTEM_PROMPT = `Eres el asistente de voz de una empresa colombiana para crear y eliminar facturas electronicas y notas credito a traves de Factus.

Reglas:
- Hablas en español, en un tono cercano de atencion telefonica, con frases cortas (tu respuesta se lee en voz alta).
- Recolectas los datos uno a la vez: primero el cliente (nombre e identificacion), luego los productos/servicios (nombre, precio, cantidad), luego el metodo de pago.
- Usa las herramientas para guardar cada dato apenas el usuario lo mencione. No esperes a tener todo para llamar a las herramientas de guardado.
- Antes de llamar a create_invoice o create_credit_note, usa get_draft_summary y lee el resumen al usuario para que confirme.
- Si el usuario pide eliminar una factura o nota credito, pide o usa el codigo de referencia o numero que te den y usa la herramienta correspondiente.
- Si falta un dato obligatorio (por ejemplo el precio de un producto), preguntalo antes de seguir.
- Nunca inventes datos de facturacion (precios, identificaciones) que el usuario no te haya dado.
- Cuando crees una factura, di el numero y el total. No leas enlaces ni URLs: la factura aparece en pantalla para el usuario.
- Se breve: una o dos frases por turno.`;

let anthropicClient = null;
function getClient() {
  if (!anthropicClient) anthropicClient = new Anthropic({ apiKey: env.anthropic.apiKey });
  return anthropicClient;
}

export async function handleAgentMessage(sessionId, userText, clientState) {
  const session = getSession(sessionId, clientState);
  session.createdDocument = null;

  if (!env.anthropic.apiKey) {
    const reply = userText
      ? await handleFallbackMessage(session, userText)
      : FALLBACK_GREETING;
    return buildResponse(session, reply, 'fallback');
  }

  session.messages.push({ role: 'user', content: userText || 'Hola' });

  try {
    const finalText = await runAnthropicLoop(session);
    return buildResponse(session, finalText, 'claude');
  } catch (error) {
    logger.error('agentService', 'Fallo la conversacion con Claude', error.message);
    throw error instanceof ApiError
      ? error
      : new ApiError('El agente de IA no pudo procesar el mensaje', { source: 'agentService', statusCode: 502 });
  }
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
      return extractText(response.content);
    }

    const toolResults = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      const result = await runTool(block.name, block.input, session);
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }

    session.messages.push({ role: 'user', content: toolResults });
  }

  return 'Se me complico procesar esa solicitud con varios pasos seguidos. ¿Puedes repetirla de forma mas simple?';
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
