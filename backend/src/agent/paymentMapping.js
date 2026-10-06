import { PAYMENT_FORM, PAYMENT_METHOD } from '../config/catalogs.js';

/**
 * Traduce lenguaje natural ("de contado", "con tarjeta débito", "por
 * Nequi") a los códigos DIAN que exige Factus. Vive junto al agente porque
 * es interpretación de habla, no una regla de facturación. Se busca por
 * palabras clave porque la voz rara vez llega como una sola palabra exacta.
 */

const METHOD_RULES = [
  { pattern: /debito/, code: PAYMENT_METHOD.TARJETA_DEBITO },
  { pattern: /tarjeta|visa|mastercard|datafono/, code: PAYMENT_METHOD.TARJETA_CREDITO },
  { pattern: /transfer|nequi|daviplata|pse|consignacion|bancolombia/, code: PAYMENT_METHOD.TRANSFERENCIA },
  { pattern: /efectivo|cash|billete/, code: PAYMENT_METHOD.EFECTIVO },
];

export function mapPaymentForm(text) {
  const value = normalize(text);
  // "tarjeta de credito" es un medio de pago, no una venta a credito.
  return /credito|plazo|fiado/.test(value) && !/tarjeta/.test(value) ? PAYMENT_FORM.CREDITO : PAYMENT_FORM.CONTADO;
}

export function mapPaymentMethod(text) {
  const value = normalize(text);
  if (/^tarjeta_credito$/.test(value)) return PAYMENT_METHOD.TARJETA_CREDITO;
  return METHOD_RULES.find((rule) => rule.pattern.test(value))?.code ?? PAYMENT_METHOD.EFECTIVO;
}

function normalize(text) {
  return String(text ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '_');
}
