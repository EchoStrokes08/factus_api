/**
 * Parsers de texto libre -> valores primitivos. Usados por el agente de
 * respaldo (fallbackAgent) cuando no hay modelo de lenguaje disponible.
 */

export function parseAmount(text) {
  if (text == null) return null;
  const normalized = text.toString().toLowerCase().trim();

  const milMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*mil/);
  if (milMatch) {
    return Math.round(parseFloat(milMatch[1].replace(',', '.')) * 1000);
  }

  const digits = normalized.replace(/[^\d]/g, '');
  if (!digits) return null;
  return Number(digits);
}

export function parseQuantity(text) {
  if (text == null) return 1;
  const normalized = text.toString().toLowerCase().trim();
  if (/^(una?|1)$/.test(normalized)) return 1;
  const amount = parseAmount(normalized);
  return amount && amount > 0 ? amount : 1;
}

export function isAffirmative(text) {
  return /^(s[ií]|claro|correcto|dale|ok|vale|exacto|afirmativo)\b/i.test(text?.trim() || '');
}

export function isNegative(text) {
  return /^(no|negativo|nop)\b/i.test(text?.trim() || '');
}
