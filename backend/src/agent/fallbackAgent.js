import { runTool } from './tools.js';
import { resetDraft } from './sessionStore.js';
import { parseAmount, parseQuantity, isAffirmative, isNegative } from './textParsing.js';
import { resolveMunicipalityCode } from '../config/daneDivipola.js';

/**
 * Agente guiado por pasos, sin modelo de lenguaje. Se activa solo cuando no
 * hay ANTHROPIC_API_KEY, para que la app siga siendo usable de punta a punta
 * sin esa dependencia. Habla el mismo "idioma" de tools.js; solo que decide
 * el siguiente paso con una maquina de estados (flowStep) en vez de un modelo.
 */

const GREETING =
  'Hola, soy el asistente de facturación. Dime el nombre del cliente, o "anular factura" seguido del número si quieres anular una.';

const PAYMENT_LABEL = { 10: 'efectivo', 42: 'transferencia', 48: 'tarjeta de crédito', 49: 'tarjeta débito' };

const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export const FALLBACK_GREETING = GREETING;

export async function handleFallbackMessage(session, text) {
  session.flowStep ||= 'ask_customer_name';
  session.flowData ||= {};

  // El reconocimiento de voz suele cerrar la frase con punto ("Juan Pérez.").
  const said = (text || '').trim().replace(/[.!?¡¿]+$/, '').trim();

  try {
    return (await handleGlobalIntents(session, said)) ?? (await handleStep(session, said));
  } catch (error) {
    // Un rechazo de Factus no debe colgar la llamada: se explica y se sigue.
    return `No pude completarlo: ${error.message}. ¿Qué quieres hacer?`;
  }
}

async function handleStep(session, said) {
  switch (session.flowStep) {
    case 'ask_customer_name': {
      if (!said) return GREETING;
      const name = said
        .replace(/^(?:(?:haz(?:me)?|crea|emite)\s+)?(?:una\s+)?(?:factura\s+)?(?:para|a\s+nombre\s+de)\s+/i, '')
        .replace(/^(?:el|la)\s+cliente\s+(?:es|se\s+llama)\s+/i, '');
      // Sin modelo de lenguaje no se puede desarmar una frase completa.
      if (/\d/.test(name) || name.split(/\s+/).length > 6 || isAffirmative(name) || isNegative(name)) {
        return 'Vamos paso a paso: dime primero solo el nombre del cliente.';
      }
      await runTool('update_customer', { names: name }, session);
      session.flowStep = 'ask_customer_id';
      return `Gracias. ¿Cuál es la cédula o el NIT de ${name}?`;
    }

    case 'ask_customer_id': {
      const id = said.replace(/[^\d]/g, '');
      if (id.length < 5) return 'No entendí el número. Dímelo solo con dígitos, por ejemplo: 1020304050.';
      await runTool('update_customer', { identification: id }, session);
      session.flowStep = 'ask_customer_city';
      return '¿En qué ciudad está el cliente?';
    }

    case 'ask_customer_city': {
      if (!/^omit/i.test(said)) {
        if (!resolveMunicipalityCode(said)) {
          return `No reconozco "${said}" en el catálogo DANE. Prueba con la capital más cercana.`;
        }
        await runTool('update_customer', { city: said }, session);
      }
      session.flowStep = 'ask_item_name';
      return '¿Qué producto o servicio vas a facturar?';
    }

    case 'ask_item_name': {
      if (!said) return '¿Qué producto o servicio vas a facturar?';
      session.flowData.pendingItem = { name: said };
      session.flowStep = 'ask_item_price';
      return `¿Cuál es el precio unitario de "${said}" en pesos, sin IVA?`;
    }

    case 'ask_item_price': {
      const price = parseAmount(said);
      if (!price) return 'No entendí el precio. Dime solo el número, por ejemplo: 50000 o "50 mil".';
      session.flowData.pendingItem.price = price;
      session.flowStep = 'ask_item_qty';
      return '¿Cuántas unidades? Si es una sola, di "una".';
    }

    case 'ask_item_qty': {
      await runTool('add_item', { ...session.flowData.pendingItem, quantity: parseQuantity(said) }, session);
      session.flowData.pendingItem = null;
      session.flowStep = 'ask_more_items';
      return '¿Agrego otro producto? (sí/no)';
    }

    case 'ask_more_items': {
      if (isAffirmative(said)) {
        session.flowStep = 'ask_item_name';
        return '¿Qué otro producto o servicio agrego?';
      }
      session.flowStep = 'ask_payment';
      return '¿Cómo paga el cliente: efectivo, tarjeta o transferencia?';
    }

    case 'ask_payment': {
      await runTool('set_payment_method', { form: said, method: said }, session);
      session.flowStep = 'confirm';
      return `${summarize(session)}\n¿Confirmo y emito la factura? (sí/no)`;
    }

    case 'confirm': {
      if (isNegative(said)) {
        restart(session);
        return 'Listo, descarté ese borrador. Empecemos de nuevo: ¿nombre del cliente?';
      }
      if (!isAffirmative(said)) return '¿Confirmo y emito la factura? Responde sí o no.';

      try {
        const { invoice } = await runTool('create_invoice', {}, session);
        session.flowStep = 'ask_customer_name';
        return (
          `Factura ${invoice.number} emitida por ${money.format(invoice.total)}. ` +
          'Te la dejo en pantalla. ¿Facturamos algo más? Dime el nombre del siguiente cliente.'
        );
      } catch (error) {
        // El borrador (y su referencia) se conserva: reintentar no duplica.
        return `Factus no emitió la factura: ${error.message}. ¿Lo intento de nuevo? (sí/no)`;
      }
    }

    case 'confirm_cancel': {
      const target = session.flowData.cancelTarget;
      session.flowStep = session.flowData.resumeStep || 'ask_customer_name';
      session.flowData.cancelTarget = null;
      if (!isAffirmative(said)) return 'Entendido, no anulé nada. ¿En qué seguimos?';
      const result = await runTool('delete_invoice', { reference_code: target }, session);
      return [result.message, result.warning].filter(Boolean).join(' ');
    }

    default:
      restart(session);
      return GREETING;
  }
}

async function handleGlobalIntents(session, said) {
  if (/^(reiniciar|empezar de nuevo|cancelar)$/i.test(said)) {
    restart(session);
    return 'Listo, empezamos de nuevo. ¿Nombre del cliente?';
  }

  const cancelInvoice = said.match(/^(?:elimina(?:r)?|anula(?:r)?|borra(?:r)?)\s+(?:la\s+)?factura\s+(?:n[uú]mero\s+)?(.+)$/i);
  if (cancelInvoice) {
    const target = cancelInvoice[1].replace(/\s+/g, '').toUpperCase();
    session.flowData.cancelTarget = target;
    session.flowData.resumeStep = session.flowStep;
    session.flowStep = 'confirm_cancel';
    return `¿Confirmas que elimino o anulo la factura ${target}? Si ya está validada por la DIAN se emitirá una nota crédito de anulación. (sí/no)`;
  }

  const deleteCreditNote = said.match(/^elimina(?:r)?\s+(?:la\s+)?nota\s+cr[eé]dito\s+(.+)$/i);
  if (deleteCreditNote) {
    const result = await runTool('delete_credit_note', { reference_code: deleteCreditNote[1].trim() }, session);
    return result.message;
  }

  if (/^resumen$/i.test(said)) return summarize(session);

  return null;
}

function restart(session) {
  resetDraft(session);
  session.flowStep = 'ask_customer_name';
  session.flowData = {};
}

function summarize(session) {
  const { customer, items, payment } = session.draft;
  const itemsText = items
    .map((item) => `- ${item.name} x${item.quantity} = ${money.format(item.price * item.quantity)} + IVA`)
    .join('\n');
  return (
    `Cliente: ${customer.names || customer.company || 'sin nombre'} (${customer.identification || 'sin identificación'})` +
    `${customer.city ? `, ${customer.city}` : ''}\n` +
    `Productos:\n${itemsText || '  (ninguno)'}\n` +
    `Pago: ${PAYMENT_LABEL[payment.payment_method_code] ?? 'sin definir'}${payment.payment_form === '2' ? ', a crédito' : ''}`
  );
}
