import * as billsApi from '../api/factusBillsClient.js';
import { withFactusToken } from './tokenManager.js';
import { invalidateRangeCache, resolveRangeId } from './numberingRangeService.js';
import { createCancellationNote } from './creditNoteService.js';
import * as collectionService from './collectionService.js';
import { buildCustomer, buildItems, buildPaymentDetails, computeTotal, generateReferenceCode } from './documentBuilder.js';
import { toInvoiceView, unwrapDocument, unwrapPage } from './mappers/factusMapper.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

/**
 * Logica de negocio de facturas: que forma tiene el documento, en que orden
 * se llama a Factus y a Factus Pay, y que se devuelve al frontend/agente.
 * No sabe nada de axios ni de endpoints: eso vive en api/.
 */

export const newInvoiceReference = () => generateReferenceCode('FACT');

/**
 * Emite la factura (POST /v2/bills/validate) con el rango de numeracion
 * activo y abre su cobro en Factus Pay. Si se repite el reference_code,
 * Factus devuelve la factura existente: reintentar es seguro.
 */
export async function createInvoice(draft) {
  const items = buildItems(draft.items);
  const total = computeTotal(items);

  const payload = {
    reference_code: draft.reference_code || newInvoiceReference(),
    numbering_range_id: draft.numbering_range_id ?? (await resolveRangeId('bill')),
    observation: draft.observation || undefined,
    customer: buildCustomer(draft.customer),
    items,
    payment_details: buildPaymentDetails({ ...draft.payment, amount: total }),
  };

  let response;
  try {
    response = await withFactusToken((token) => billsApi.createAndValidate(token, payload));
  } catch (error) {
    // Un rechazo puede deberse a un rango desactivado desde el panel de
    // Factus: la siguiente factura debe reconsultar los rangos.
    if (error.statusCode >= 400 && error.statusCode < 500) invalidateRangeCache();
    throw error;
  }

  const invoice = withMode(toInvoiceView({ reference_code: payload.reference_code, ...unwrapDocument(response) }));
  if (!invoice.is_validated) {
    logger.warn('invoiceService', `Factus registró ${payload.reference_code} pero la DIAN no la validó`);
  }
  logger.info('invoiceService', `Factura ${invoice.number} emitida`, { reference: payload.reference_code, total });

  const collection = invoice.is_validated
    ? await collectionService.openCollection(payload.reference_code, invoice.totals.total || total)
    : null;

  return { invoice, collection };
}

export async function listInvoices(params = {}) {
  const response = await withFactusToken((token) => billsApi.list(token, params));
  const { rows, pagination } = unwrapPage(response);
  return { items: rows.map((row) => withMode(toInvoiceView(row))), pagination };
}

/**
 * Detalle completo de una factura a partir de su codigo de referencia o de
 * su numero (SETP990001042). Factus solo expone el detalle por numero, asi
 * que una referencia se traduce primero con el filtro del listado.
 */
export async function getInvoice(identifier) {
  const key = String(identifier ?? '').trim();
  if (!key) throw badRequest('Indica el número o el código de referencia de la factura');

  const { items } = await listInvoices({ 'filter[reference_code]': key });
  // El filtro puede ser parcial ("FACT-1" coincide con "FACT-10"): solo vale la exacta.
  const number = items.find((item) => item.reference_code === key)?.number ?? key;

  try {
    const response = await withFactusToken((token) => billsApi.get(token, number));
    return withMode(toInvoiceView(unwrapDocument(response)));
  } catch (error) {
    if (error.statusCode === 404) {
      throw new ApiError(`No encontré ninguna factura con número o referencia "${key}"`, {
        source: 'invoiceService',
        statusCode: 404,
      });
    }
    throw error;
  }
}

/**
 * "Eliminar" una factura respetando la ley colombiana:
 *   - Sin validar (sin CUFE): se destruye en Factus (DELETE /v2/bills/destroy).
 *   - Validada por la DIAN:   no se puede borrar; se anula con una nota
 *     credito de concepto 2 que la replica completa (Decreto 358 de 2020).
 * Es idempotente: una factura ya anulada no genera una segunda nota.
 */
export async function cancelInvoice(identifier) {
  const invoice = await getInvoice(identifier);

  if (invoice.voided_by.length) {
    return {
      outcome: 'already_voided',
      message: `La factura ${invoice.number} ya estaba anulada con la nota crédito ${invoice.voided_by[0]}.`,
      invoice,
      creditNote: null,
      warning: null,
    };
  }

  if (!invoice.is_validated) {
    const deleted = await tryDestroy(invoice);
    if (deleted) return deleted;
  }

  const creditNote = await createCancellationNote(invoice);
  return {
    outcome: 'voided',
    message: `La factura ${invoice.number} quedó anulada ante la DIAN con la nota crédito ${creditNote.number}.`,
    invoice: { ...invoice, voided_by: [creditNote.number] },
    creditNote,
    warning: await paidCollectionWarning(invoice.reference_code),
  };
}

export async function getInvoicePdf(identifier) {
  const invoice = await getInvoice(identifier);
  const response = await withFactusToken((token) => billsApi.downloadPdf(token, invoice.number));
  const data = response?.data ?? response ?? {};
  const encoded = data.pdf_base_64_encoded ?? data.pdf_base64 ?? data.file;
  if (!encoded) {
    throw new ApiError('Factus no devolvió el PDF de la factura', { source: 'invoiceService', statusCode: 502 });
  }
  const baseName = String(data.file_name || invoice.number).replace(/\.pdf$/i, '');
  return { fileName: `${baseName}.pdf`, content: Buffer.from(encoded, 'base64') };
}

export const getCollection = (referenceCode) => collectionService.getCollection(referenceCode);

async function tryDestroy(invoice) {
  try {
    await withFactusToken((token) => billsApi.destroyByReference(token, invoice.reference_code));
    return {
      outcome: 'deleted',
      message: `La factura ${invoice.number ?? invoice.reference_code} no estaba validada por la DIAN y se eliminó de Factus.`,
      invoice,
      creditNote: null,
      warning: null,
    };
  } catch (error) {
    if (error.statusCode !== 409 && error.statusCode !== 422) throw error;
    // Factus dice que ya no es destruible: la DIAN pudo validarla mientras
    // tanto. Solo se anula si el detalle fresco lo confirma.
    const fresh = await getInvoice(invoice.reference_code);
    if (!fresh.is_validated) throw error;
    return null;
  }
}

async function paidCollectionWarning(referenceCode) {
  try {
    const collection = await collectionService.getCollection(referenceCode);
    return collection.status === 'paid'
      ? 'El cliente ya pagó esta factura en Factus Pay: recuerda devolverle el dinero.'
      : null;
  } catch {
    return null;
  }
}

const withMode = (view) => ({ ...view, simulated: env.mockMode });
const badRequest = (message) => new ApiError(message, { source: 'invoiceService', statusCode: 400 });
