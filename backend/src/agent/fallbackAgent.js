import { runTool } from './tools.js';
import { resetDraft } from './sessionStore.js';
import { parseAmount, parseQuantity, isAffirmative, isNegative } from './textParsing.js';

/**
 * Agente guiado por pasos, sin modelo de lenguaje. Se activa automaticamente
 * cuando no hay ANTHROPIC_API_KEY configurada, para que la app siga siendo
 * usable (y probable de punta a punta) sin esa dependencia externa. Habla el
 * mismo "idioma" de tools.js, solo que decide el siguiente paso con un
 * estado (flowStep) en vez de un modelo.
 */

const GREETING =
  'Hola, soy el asistente de facturacion. Para comenzar, dime el nombre completo del cliente.';

export async function handleFallbackMessage(session, text) {
  if (!session.flowStep) session.flowStep = 'ask_customer_name';
  if (!session.flowData) session.flowData = {};

  const trimmed = (text || '').trim();

  const globalReply = await handleGlobalIntents(session, trimmed);
  if (globalReply) return globalReply;

  switch (session.flowStep) {
    case 'ask_customer_name': {
      if (!trimmed) return GREETING;
      await runTool('update_customer', { names: trimmed }, session);
      session.flowStep = 'ask_customer_id';
      return `Gracias, ${trimmed}. ¿Cual es su numero de identificacion (cedula o NIT)?`;
    }

    case 'ask_customer_id': {
      const id = trimmed.replace(/[^\d]/g, '');
      await runTool('update_customer', { identification: id || trimmed }, session);
      session.flowStep = 'ask_item_name';
      return '¿Que producto o servicio vas a facturar?';
    }

    case 'ask_item_name': {
      session.flowData.pendingItem = { name: trimmed };
      session.flowStep = 'ask_item_price';
      return `¿Cual es el precio unitario de "${trimmed}" en pesos, sin IVA?`;
    }

    case 'ask_item_price': {
      const price = parseAmount(trimmed);
      if (!price) return 'No entendi el precio. Dime solo el numero, por ejemplo: 50000';
      session.flowData.pendingItem.price = price;
      session.flowStep = 'ask_item_qty';
      return '¿Cuantas unidades? Si es una sola, dime "una".';
    }

    case 'ask_item_qty': {
      const quantity = parseQuantity(trimmed);
      await runTool('add_item', { ...session.flowData.pendingItem, quantity }, session);
      session.flowData.pendingItem = null;
      session.flowStep = 'ask_more_items';
      return '¿Agrego otro producto? (si/no)';
    }

    case 'ask_more_items': {
      if (isAffirmative(trimmed)) {
        session.flowStep = 'ask_item_name';
        return '¿Que otro producto o servicio agrego?';
      }
      session.flowStep = 'ask_payment';
      return '¿Como paga el cliente? efectivo, tarjeta o transferencia';
    }

    case 'ask_payment': {
      await runTool('set_payment_method', { form: 'contado', method: trimmed }, session);
      session.flowStep = 'confirm';
      return `${summarize(session)}\n¿Confirmo y creo la factura? (si/no)`;
    }

    case 'confirm': {
      if (isNegative(trimmed)) {
        session.flowStep = 'ask_customer_name';
        resetDraft(session);
        return 'Listo, cancele ese borrador. Empecemos de nuevo: ¿nombre del cliente?';
      }
      if (!isAffirmative(trimmed)) {
        return '¿Confirmo y creo la factura? Responde si o no.';
      }
      const { result } = await runTool('create_invoice', {}, session);
      session.flowStep = 'ask_customer_name';
      const total = result.invoice?.data?.totals?.total;
      const url = result.collection?.data?.collection_url;
      return (
        `Factura creada con numero ${result.invoice?.data?.number || ''}, total $${total || ''}.` +
        (url ? ` Enlace de cobro: ${url}` : '') +
        ' ¿Facturamos algo mas? Dime el nombre del siguiente cliente.'
      );
    }

    default:
      session.flowStep = 'ask_customer_name';
      return GREETING;
  }
}

async function handleGlobalIntents(session, trimmed) {
  if (/^(reiniciar|empezar de nuevo|cancelar)$/i.test(trimmed)) {
    resetDraft(session);
    session.flowStep = 'ask_customer_name';
    return 'Listo, empezamos de nuevo. ¿Nombre del cliente?';
  }

  const deleteInvoiceMatch = trimmed.match(/^elimina(r)?\s+(la\s+)?factura\s+(.+)$/i);
  if (deleteInvoiceMatch) {
    const { result } = await runTool('delete_invoice', { reference_code: deleteInvoiceMatch[3].trim() }, session);
    return result.message || 'Factura eliminada.';
  }

  const deleteCreditNoteMatch = trimmed.match(/^elimina(r)?\s+(la\s+)?nota\s+credito\s+(.+)$/i);
  if (deleteCreditNoteMatch) {
    const { result } = await runTool(
      'delete_credit_note',
      { reference_code: deleteCreditNoteMatch[3].trim() },
      session,
    );
    return result.message || 'Nota credito eliminada.';
  }

  if (/^resumen$/i.test(trimmed)) {
    return summarize(session);
  }

  return null;
}

function summarize(session) {
  const { customer, items, payment } = session.draft;
  const itemsText = items
    .map((item) => `- ${item.name} x${item.quantity} = $${(item.price * item.quantity).toFixed(2)}`)
    .join('\n');
  return (
    `Cliente: ${customer.names || customer.company || 'sin nombre'} (${customer.identification || 'sin ID'})\n` +
    `Productos:\n${itemsText || '  (ninguno)'}\n` +
    `Pago: ${payment.payment_method_code ? 'registrado' : 'sin definir'}`
  );
}

export const FALLBACK_GREETING = GREETING;
