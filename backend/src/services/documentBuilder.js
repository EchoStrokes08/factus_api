import { randomBytes } from 'node:crypto';
import {
  DEFAULT_COUNTRY_CODE,
  DEFAULT_RESPONSIBILITY,
  DEFAULT_TRIBUTE_CODE,
  IDENTIFICATION_DOCUMENTS,
  LEGAL_ORGANIZATION,
  PAYMENT_FORM,
  PAYMENT_METHOD,
  STANDARD_CODE,
  UNIT_MEASURE,
} from '../config/catalogs.js';
import { resolveMunicipalityCode } from '../config/daneDivipola.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Traduce el "draft" simplificado que maneja el agente de IA (lenguaje
 * natural -> objeto minimo) al payload exacto que exige la API de Factus.
 * Esta es la unica pieza que conoce ambos mundos; si Factus cambia su
 * esquema, se arregla aqui sin tocar el agente ni los clientes HTTP.
 */

const SOURCE = 'documentBuilder';
const CREDIT_DUE_DAYS = 30;

/**
 * Referencia unica legible (FACT-20261005-9F3A1C2B). Aleatoria y no un
 * contador en memoria: en serverless varias instancias emiten en paralelo.
 */
export function generateReferenceCode(prefix) {
  const day = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `${prefix}-${day}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

export function buildCustomer(customerDraft = {}) {
  const identification = String(customerDraft.identification ?? '').replace(/[^\dA-Za-z]/g, '');
  if (!identification) throw badRequest('El cliente necesita un número de identificación (cédula o NIT)');

  const isCompany = Boolean(customerDraft.company);
  if (!isCompany && !customerDraft.names) throw badRequest('El cliente necesita un nombre o una razón social');

  const documentCode =
    customerDraft.identification_document_code ||
    (isCompany ? IDENTIFICATION_DOCUMENTS.NIT : IDENTIFICATION_DOCUMENTS.CEDULA_CIUDADANIA);

  return compact({
    identification_document_code: documentCode,
    identification,
    dv: customerDraft.dv,
    legal_organization_code: isCompany ? LEGAL_ORGANIZATION.PERSONA_JURIDICA : LEGAL_ORGANIZATION.PERSONA_NATURAL,
    tribute_code: customerDraft.tribute_code || DEFAULT_TRIBUTE_CODE,
    responsibilities: customerDraft.responsibilities || DEFAULT_RESPONSIBILITY,
    company: customerDraft.company,
    trade_name: customerDraft.trade_name,
    names: isCompany ? undefined : customerDraft.names,
    address: customerDraft.address,
    email: customerDraft.email,
    phone: customerDraft.phone,
    country_code: customerDraft.country_code || DEFAULT_COUNTRY_CODE,
    municipality_code: resolveMunicipalityCode(
      customerDraft.municipality_code || customerDraft.municipality || customerDraft.city,
    ),
  });
}

/**
 * Acepta tanto los items del borrador del agente como los de una factura ya
 * emitida (vista normalizada por factusMapper), para que la nota credito de
 * anulacion replique la factura linea por linea.
 */
export function buildItems(itemsDraft = []) {
  if (!itemsDraft.length) throw badRequest('El documento necesita al menos un producto o servicio');

  return itemsDraft.map((item, index) => {
    const quantity = Number(item.quantity ?? 1);
    const price = Number(item.price);
    if (!item.name || !Number.isFinite(price) || price <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
      throw badRequest(`El ítem #${index + 1} necesita nombre, cantidad y un precio mayor que cero`);
    }

    return compact({
      code_reference: item.code_reference || `ITEM-${index + 1}`,
      name: String(item.name),
      quantity: quantity.toFixed(2),
      price: price.toFixed(2),
      unit_measure_code: item.unit_measure_code || UNIT_MEASURE.UNIDAD,
      standard_code: item.standard_code || STANDARD_CODE.USO_INTERNO_VENDEDOR,
      discount_rate: Number(item.discount_rate) > 0 ? Number(item.discount_rate).toFixed(2) : undefined,
      taxes: [resolveTax(item)],
    });
  });
}

export function buildPaymentDetails({ payment_form, payment_method_code, amount, due_date } = {}) {
  const form = payment_form || PAYMENT_FORM.CONTADO;
  return [
    compact({
      payment_form: form,
      payment_method_code: payment_method_code || PAYMENT_METHOD.EFECTIVO,
      amount: Number(amount).toFixed(2),
      // Factus exige fecha de vencimiento cuando la venta es a credito.
      due_date: form === PAYMENT_FORM.CREDITO ? due_date || addDays(CREDIT_DUE_DAYS) : undefined,
    }),
  ];
}

/**
 * Total a pagar de items ya construidos. Redondea base e impuesto por linea,
 * igual que la representacion grafica de la DIAN, para que el monto del
 * pago y del recaudo coincidan centavo a centavo con el total de Factus.
 */
export function computeTotal(items = []) {
  const total = items.reduce((sum, item) => {
    const base = round2(Number(item.price) * Number(item.quantity) * (1 - Number(item.discount_rate || 0) / 100));
    const tax = round2(base * (Number(item.taxes?.[0]?.rate ?? 0) / 100));
    return sum + base + tax;
  }, 0);
  return round2(total);
}

function resolveTax(item) {
  const code = item.tax_code || '01';
  if (item.is_excluded) return { code, rate: '0.00', is_excluded: true };
  const rate = item.tax_rate == null || item.tax_rate === '' ? 19 : Number(item.tax_rate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw badRequest(`Tarifa de IVA inválida: ${item.tax_rate}`);
  return { code, rate: rate.toFixed(2) };
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Quita claves vacias: Factus valida tipos y rechaza `null` en opcionales. */
function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value != null && value !== ''));
}

const round2 = (value) => Math.round(value * 100) / 100;
const badRequest = (message) => new ApiError(message, { source: SOURCE, statusCode: 400 });
