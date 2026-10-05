import { PAYMENT_FORM, PAYMENT_METHOD } from '../config/catalogs.js';

/**
 * Traduce lenguaje natural ("de contado", "con tarjeta", "transferencia")
 * a los codigos que exige Factus. Vive junto al agente porque es
 * interpretacion de habla, no una regla de facturacion.
 */

const FORM_SYNONYMS = {
  contado: PAYMENT_FORM.CONTADO,
  efectivo: PAYMENT_FORM.CONTADO,
  credito: PAYMENT_FORM.CREDITO,
};

const METHOD_SYNONYMS = {
  efectivo: PAYMENT_METHOD.EFECTIVO,
  tarjeta_credito: PAYMENT_METHOD.TARJETA_CREDITO,
  tarjeta_debito: PAYMENT_METHOD.TARJETA_DEBITO,
  tarjeta: PAYMENT_METHOD.TARJETA_CREDITO,
  transferencia: PAYMENT_METHOD.TRANSFERENCIA,
};

export function mapPaymentForm(text) {
  if (!text) return PAYMENT_FORM.CONTADO;
  return FORM_SYNONYMS[normalize(text)] || PAYMENT_FORM.CONTADO;
}

export function mapPaymentMethod(text) {
  if (!text) return PAYMENT_METHOD.EFECTIVO;
  return METHOD_SYNONYMS[normalize(text)] || PAYMENT_METHOD.EFECTIVO;
}

function normalize(text) {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_');
}
