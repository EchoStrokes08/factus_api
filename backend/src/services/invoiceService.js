import * as billsApi from '../api/factusBillsClient.js';
import * as collectionsApi from '../api/factusPayCollectionsClient.js';
import { getFactusToken, getFactusPayToken } from './tokenManager.js';
import { buildCustomer, buildItems, buildPaymentDetails, computeTotal, generateReferenceCode } from './documentBuilder.js';
import { logger } from '../utils/logger.js';

/**
 * Logica de negocio de facturas: decide que forma debe tener el documento,
 * en que orden se llama a Factus y a Factus Pay, y que se devuelve al
 * frontend/agente. No sabe nada de axios ni de endpoints: eso vive en api/.
 */

export async function createInvoice(draft) {
  const referenceCode = draft.reference_code || generateReferenceCode('FACT');
  const items = buildItems(draft.items);
  const total = computeTotal(items);

  const payload = {
    reference_code: referenceCode,
    numbering_range_id: draft.numbering_range_id,
    observation: draft.observation,
    customer: buildCustomer(draft.customer),
    items,
    payment_details: buildPaymentDetails({ ...draft.payment, amount: total }),
  };

  const token = await getFactusToken();
  const invoice = await billsApi.createAndValidateBill(token, payload);

  logger.info('invoiceService', `Factura creada: ${referenceCode}`, { total: total.toFixed(2) });

  const payToken = await getFactusPayToken();
  const collection = await collectionsApi.createCollection(payToken, {
    reference_code: referenceCode,
    amount: Number(total.toFixed(2)),
  });

  return { invoice, collection };
}

export async function deleteInvoice(referenceCode) {
  const token = await getFactusToken();
  return billsApi.deleteBillByReference(token, referenceCode);
}

export async function listInvoices(params) {
  const token = await getFactusToken();
  return billsApi.listBills(token, params);
}

export async function getInvoice(referenceCode) {
  const token = await getFactusToken();
  return billsApi.getBillByReference(token, referenceCode);
}
