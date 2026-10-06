import * as creditNotesApi from '../api/factusCreditNotesClient.js';
import { withFactusToken } from './tokenManager.js';
import { resolveRangeId } from './numberingRangeService.js';
import { buildCustomer, buildItems, buildPaymentDetails, computeTotal, generateReferenceCode } from './documentBuilder.js';
import { toCreditNoteView, unwrapDocument, unwrapPage } from './mappers/factusMapper.js';
import {
  CREDIT_NOTE_CORRECTION_CONCEPT,
  CREDIT_NOTE_CUSTOMIZATION_WITH_BILL,
} from '../config/catalogs.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

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
  const payload = {
    reference_code: draft.reference_code || generateReferenceCode('NC'),
    correction_concept_code: draft.correction_concept_code || CREDIT_NOTE_CORRECTION_CONCEPT.DEVOLUCION_PARCIAL,
    customization_id: CREDIT_NOTE_CUSTOMIZATION_WITH_BILL,
    bill_number: draft.bill_number,
    numbering_range_id: await resolveRangeId('creditNote'),
    observation: draft.observation,
    // El cliente es opcional: si no se envia, Factus hereda el de la factura.
    customer: draft.customer?.identification ? buildCustomer(draft.customer) : undefined,
    items,
    payment_details: buildPaymentDetails({ ...draft.payment, amount: computeTotal(items) }),
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
    items,
    payment_details: buildPaymentDetails({ amount: invoice.totals.total || computeTotal(items) }),
  };

  return issue(payload);
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

async function findCreditNote(referenceCode) {
  const { items } = await listCreditNotes({ 'filter[reference_code]': referenceCode });
  return items[0] ?? null;
}

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

const withMode = (view) => ({ ...view, simulated: env.mockMode });
const badRequest = (message) => new ApiError(message, { source: 'creditNoteService', statusCode: 400 });
