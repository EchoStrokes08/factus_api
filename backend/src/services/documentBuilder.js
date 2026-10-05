import {
  DEFAULT_COUNTRY_CODE,
  DEFAULT_MUNICIPALITY_CODE,
  DEFAULT_RESPONSIBILITY,
  DEFAULT_TRIBUTE_CODE,
  LEGAL_ORGANIZATION,
  PAYMENT_FORM,
  PAYMENT_METHOD,
  STANDARD_CODE,
  TAX,
  UNIT_MEASURE,
} from '../config/catalogs.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Traduce el "draft" simplificado que maneja el agente de IA (lenguaje
 * natural -> objeto minimo) al payload exacto que exige la API de Factus.
 * Esta es la unica pieza que conoce ambos mundos; si Factus cambia su
 * esquema, se arregla aqui sin tocar el agente ni los clientes HTTP.
 */

let referenceCounter = Date.now();

export function generateReferenceCode(prefix) {
  referenceCounter += 1;
  return `${prefix}-${referenceCounter}`;
}

export function buildCustomer(customerDraft = {}) {
  if (!customerDraft.identification) {
    throw new ApiError('El cliente necesita un numero de identificacion', {
      source: 'documentBuilder',
      statusCode: 400,
    });
  }

  const isCompany = Boolean(customerDraft.company);

  return {
    identification_document_code: customerDraft.identification_document_code || '13',
    identification: customerDraft.identification,
    dv: customerDraft.dv,
    legal_organization_code: isCompany
      ? LEGAL_ORGANIZATION.PERSONA_JURIDICA
      : LEGAL_ORGANIZATION.PERSONA_NATURAL,
    tribute_code: customerDraft.tribute_code || DEFAULT_TRIBUTE_CODE,
    responsibilities: customerDraft.responsibilities || DEFAULT_RESPONSIBILITY,
    company: customerDraft.company,
    trade_name: customerDraft.trade_name,
    names: customerDraft.names,
    address: customerDraft.address,
    email: customerDraft.email,
    phone: customerDraft.phone,
    country_code: customerDraft.country_code || DEFAULT_COUNTRY_CODE,
    municipality_code: customerDraft.municipality_code || DEFAULT_MUNICIPALITY_CODE,
  };
}

export function buildItems(itemsDraft = []) {
  if (!itemsDraft.length) {
    throw new ApiError('La factura necesita al menos un producto o servicio', {
      source: 'documentBuilder',
      statusCode: 400,
    });
  }

  return itemsDraft.map((item, index) => {
    if (!item.name || item.price == null || item.quantity == null) {
      throw new ApiError(`El item #${index + 1} necesita nombre, cantidad y precio`, {
        source: 'documentBuilder',
        statusCode: 400,
      });
    }

    const tax = resolveTax(item.tax_rate);

    return {
      code_reference: item.code_reference || `ITEM-${index + 1}`,
      name: item.name,
      quantity: String(item.quantity),
      price: Number(item.price).toFixed(2),
      unit_measure_code: item.unit_measure_code || UNIT_MEASURE.UNIDAD,
      standard_code: item.standard_code || STANDARD_CODE.USO_INTERNO_VENDEDOR,
      discount_rate: item.discount_rate,
      taxes: [tax],
    };
  });
}

export function buildPaymentDetails({ payment_form, payment_method_code, amount } = {}) {
  return [
    {
      payment_form: payment_form || PAYMENT_FORM.CONTADO,
      payment_method_code: payment_method_code || PAYMENT_METHOD.EFECTIVO,
      amount: amount != null ? Number(amount).toFixed(2) : undefined,
    },
  ];
}

export function computeTotal(items = []) {
  return items.reduce((sum, item) => {
    const base = Number(item.price) * Number(item.quantity);
    const rate = Number(item.taxes?.[0]?.rate ?? 0) / 100;
    return sum + base + base * rate;
  }, 0);
}

function resolveTax(taxRate) {
  if (taxRate == null) return TAX.IVA_19;
  const normalized = Number(taxRate);
  if (normalized === 0) return TAX.EXCLUIDO;
  return { code: '01', rate: normalized.toFixed(2) };
}
