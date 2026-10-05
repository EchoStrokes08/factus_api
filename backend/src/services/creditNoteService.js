import * as creditNotesApi from '../api/factusCreditNotesClient.js';
import { getFactusToken } from './tokenManager.js';
import { buildCustomer, buildItems, buildPaymentDetails, computeTotal, generateReferenceCode } from './documentBuilder.js';
import { CREDIT_NOTE_CORRECTION_CONCEPT } from '../config/catalogs.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export async function createCreditNote(draft) {
  if (!draft.bill_number) {
    throw new ApiError('La nota credito necesita el numero de la factura original', {
      source: 'creditNoteService',
      statusCode: 400,
    });
  }

  const referenceCode = draft.reference_code || generateReferenceCode('NC');
  const items = buildItems(draft.items);
  const total = computeTotal(items);

  const payload = {
    reference_code: referenceCode,
    bill_number: draft.bill_number,
    correction_concept_code: draft.correction_concept_code || CREDIT_NOTE_CORRECTION_CONCEPT.DEVOLUCION_PARCIAL,
    observation: draft.observation,
    customer: draft.customer ? buildCustomer(draft.customer) : undefined,
    items,
    payment_details: buildPaymentDetails({ ...draft.payment, amount: total }),
  };

  const token = await getFactusToken();
  const creditNote = await creditNotesApi.createAndValidateCreditNote(token, payload);

  logger.info('creditNoteService', `Nota credito creada: ${referenceCode}`, { bill: draft.bill_number });

  return { creditNote };
}

export async function deleteCreditNote(referenceCode) {
  const token = await getFactusToken();
  return creditNotesApi.deleteCreditNoteByReference(token, referenceCode);
}

export async function listCreditNotes(params) {
  const token = await getFactusToken();
  return creditNotesApi.listCreditNotes(token, params);
}
