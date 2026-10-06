import * as creditNotesApi from '../api/factusCreditNotesClient.js';
import * as billsApi from '../api/factusBillsClient.js';
import { withFactusToken } from './tokenManager.js';
import { resolveRangeId } from './numberingRangeService.js';
import { buildCustomer, buildItems, buildPaymentDetails, computeTotal, generateReferenceCode } from './documentBuilder.js';
import { toCreditNoteView, toInvoiceView, unwrapDocument, unwrapPage } from './mappers/factusMapper.js';
import {
  CREDIT_NOTE_CORRECTION_CONCEPT,
  CREDIT_NOTE_CUSTOMIZATION_WITH_BILL,
} from '../config/catalogs.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { mapWithLimit } from '../utils/mapWithLimit.js';

/**
 * Notas credito electronicas (POST /v2/credit-notes/validate). Dos usos:
 *   - createCreditNote: correccion parcial pedida por el usuario (devolucion,
 *     descuento...) con los items que dicto al agente.
 *   - createCancellationNote: anulacion TOTAL de una factura validada
 *     (concepto DIAN 2), replicando la factura linea por linea.
 */

export async function createCreditNote(draft) {
  if (!draft.bill_number) throw badRequest('La nota crédito necesita el número de la factura que corrige');

  const items = buildItems(draft.items);
  const total = computeTotal(items);
  const invoice = await fetchInvoice(draft.bill_number);
  if (invoice.totals.total != null && total > invoice.totals.total) {
    throw badRequest(
      `La nota crédito (${money.format(total)}) no puede superar el total de la factura ${invoice.number} (${money.format(invoice.totals.total)}).`,
    );
  }

  const payload = {
    reference_code: draft.reference_code || generateReferenceCode('NC'),
    correction_concept_code: draft.correction_concept_code || CREDIT_NOTE_CORRECTION_CONCEPT.DEVOLUCION_PARCIAL,
    customization_id: CREDIT_NOTE_CUSTOMIZATION_WITH_BILL,
    bill_number: invoice.number,
    numbering_range_id: await resolveRangeId('creditNote'),
    observation: draft.observation,
    // Factus v2 exige `customer`: por defecto, el adquiriente de la factura.
    customer: draft.customer?.identification ? buildCustomer(draft.customer) : customerOf(invoice),
    items,
    payment_details: buildPaymentDetails({ ...draft.payment, amount: total }),
  };

  return issue(payload);
}

/**
 * Anula una factura validada emitiendo la nota credito de concepto 2.
 * El reference_code es deterministico (ANUL-<referencia de la factura>):
 * Factus devuelve el documento existente si se repite, asi que reintentar
 * una anulacion (doble clic, timeout, el agente lo pide dos veces) nunca
 * genera dos notas credito.
 */
export async function createCancellationNote(invoice) {
  const items = buildItems(invoice.items);
  const payload = {
    reference_code: cancellationReference(invoice),
    correction_concept_code: CREDIT_NOTE_CORRECTION_CONCEPT.ANULACION,
    customization_id: CREDIT_NOTE_CUSTOMIZATION_WITH_BILL,
    bill_number: invoice.number,
    numbering_range_id: await resolveRangeId('creditNote'),
    observation: `Anulación total de la factura electrónica ${invoice.number}`,
    customer: customerOf(invoice),
    items,
    payment_details: buildPaymentDetails({ amount: invoice.totals.total || computeTotal(items) }),
  };

  return issue(payload);
}

/** Adquiriente de la factura (vista de factusMapper) en el formato del payload. */
function customerOf(invoice) {
  const customer = invoice.customer ?? {};
  return buildCustomer({
    ...customer,
    names: customer.names || (customer.company ? undefined : customer.name),
    responsibilities: customer.responsibilities?.length ? customer.responsibilities : undefined,
  });
}

async function fetchInvoice(number) {
  try {
    const response = await withFactusToken((token) => billsApi.get(token, number));
    return toInvoiceView(unwrapDocument(response));
  } catch (error) {
    if (error.statusCode === 404) throw badRequest(`No existe la factura ${number} en Factus`);
    throw error;
  }
}

export function cancellationReference(invoice) {
  return `ANUL-${invoice.reference_code || invoice.number}`;
}

export async function deleteCreditNote(referenceCode) {
  const note = await findCreditNote(referenceCode);
  if (note?.is_validated) {
    throw new ApiError(
      `La nota crédito ${note.number} ya fue validada por la DIAN: la ley no permite eliminarla. Si necesitas revertirla, emite una nota débito.`,
      { source: 'creditNoteService', statusCode: 409 },
    );
  }
  await withFactusToken((token) => creditNotesApi.destroyByReference(token, referenceCode));
  return { outcome: 'deleted', message: `Nota crédito ${referenceCode} eliminada de Factus.` };
}

export async function listCreditNotes(params = {}) {
  const response = await withFactusToken((token) => creditNotesApi.list(token, params));
  const { rows, pagination } = unwrapPage(response);
  return { items: rows.map((row) => withMode(toCreditNoteView(row))), pagination };
}

const MAX_NUMBERS = 50;

/**
 * Notas credito por numero exacto (filter[number]). Con la cuenta sandbox
 * compartida, el listado general mezcla las de otros equipos: el frontend
 * pide solo las que cuelgan de sus propias facturas.
 */
export async function listCreditNotesByNumbers(numbers = []) {
  const unique = [...new Set(numbers.map((number) => String(number).trim()).filter(Boolean))].slice(0, MAX_NUMBERS);
  const found = await mapWithLimit(unique, 5, async (number) => {
    const { items } = await listCreditNotes({ 'filter[number]': number });
    return items.find((item) => item.number === number) ?? null;
  });
  return { items: found.filter(Boolean), pagination: null };
}

async function findCreditNote(referenceCode) {
  const { items } = await listCreditNotes({ 'filter[reference_code]': referenceCode });
  return items[0] ?? null;
}

/** La nota de anulacion de `invoice`, si ya se emitio (referencia ANUL-...). */
export const findCancellationNote = (invoice) => findCreditNote(cancellationReference(invoice));

async function issue(payload) {
  const response = await withFactusToken((token) => creditNotesApi.createAndValidate(token, payload));
  // La respuesta no siempre repite la factura ni el concepto: se completan
  // con lo que se envio para que la vista siempre diga que corrige.
  const document = unwrapDocument(response);
  const creditNote = withMode(
    toCreditNoteView({
      ...document,
      bill_number: document.bill_number ?? document.bill?.number ?? payload.bill_number,
      correction_concept_code: document.correction_concept_code ?? payload.correction_concept_code,
    }),
  );
  logger.info('creditNoteService', `Nota crédito ${creditNote.number} emitida`, {
    bill: payload.bill_number,
    concept: payload.correction_concept_code,
  });
  return creditNote;
}

const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const withMode = (view) => ({ ...view, simulated: env.mockMode });
const badRequest = (message) => new ApiError(message, { source: 'creditNoteService', statusCode: 400 });
