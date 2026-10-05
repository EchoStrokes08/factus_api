import * as billsApi from '../api/factusBillsClient.js';
import * as collectionsApi from '../api/factusPayCollectionsClient.js';
import { getFactusToken, getFactusPayToken } from './tokenManager.js';
import { buildCustomer, buildItems, buildPaymentDetails, computeTotal, generateReferenceCode } from './documentBuilder.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

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

  // Sin credenciales de Factus Pay la factura ya quedo emitida: no la
  // tumbamos por el cobro, solo omitimos el enlace de pago.
  if (!env.mockMode && (!env.factusPay.email || !env.factusPay.password)) {
    logger.info('invoiceService', 'Factus Pay sin credenciales: se omite el cobro');
    return { invoice, collection: null };
  }

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

/**
 * Reduce la respuesta de createInvoice a lo que el agente/frontend necesita
 * para mostrar la factura. Acepta tanto la forma simulada (data.number) como
 * la real de Factus (data.bill.number). Solo expone enlaces que de verdad
 * existen: en modo mock no hay URL publica ni de cobro.
 */
export function summarizeInvoice({ invoice, collection } = {}) {
  const data = invoice?.data || {};
  const bill = data.bill || data;
  const customer = data.customer || {};

  return {
    number: bill.number,
    reference_code: bill.reference_code,
    cufe: bill.cufe,
    is_validated: Boolean(bill.is_validated ?? bill.validated),
    created_at: bill.created_at || data.created_at,
    customer: {
      name: customer.names || customer.company || customer.graphic_representation_name,
      identification: customer.identification,
    },
    items: (data.items || []).map((item) => ({
      name: item.name,
      quantity: Number(item.quantity),
      price: Number(item.price),
      tax_rate: Number(item.taxes?.[0]?.rate ?? item.tax_rate ?? 0),
    })),
    totals: data.totals || { total: bill.total },
    public_url: realUrl(bill.public_url || data.links?.public_url),
    payment_url: realUrl(collection?.data?.collection_url || collection?.data?.url),
  };
}

function realUrl(url) {
  if (typeof url !== 'string' || !/^https:\/\//.test(url)) return null;
  return new URL(url).hostname.endsWith('.local') ? null : url;
}
