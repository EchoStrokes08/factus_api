/**
 * Parsers de texto libre -> valores primitivos. Los usa el agente guiado
 * (fallbackAgent) cuando no hay modelo de lenguaje. Están pensados para lo
 * que entrega el reconocimiento de voz: "120 mil", "dos", "sí.", "$50.000".
 */

const NUMBER_WORDS = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, veinte: 20, treinta: 30, cien: 100,
};

// \b no reconoce letras acentuadas ("sí"), así que el final de palabra se
// define a mano: fin de texto, espacio o puntuación.
const END = '(?=$|[\\s,.;:!?¡¿])';
const AFFIRMATIVE = new RegExp(`^(s[ií]|claro|correcto|dale|ok|okay|vale|exacto|afirmativo|listo|confirmo|hazlo)${END}`, 'i');
const NEGATIVE = new RegExp(`^(no|negativo|nop|cancela|mejor no)${END}`, 'i');

export function parseAmount(text) {
  if (text == null) return null;
  const normalized = clean(text);

  const thousands = normalized.match(/(\d+(?:[.,]\d+)?)\s*(mil|k)\b/);
  if (thousands) return Math.round(parseFloat(thousands[1].replace(',', '.')) * 1000);

  const millions = normalized.match(/(\d+(?:[.,]\d+)?)\s*(millones|millon)/);
  if (millions) return Math.round(parseFloat(millions[1].replace(',', '.')) * 1_000_000);

  // "50.000" y "50,000" son miles en Colombia; "50.000,50" lleva centavos.
  const numeric = normalized.match(/\d[\d.,]*/);
  if (numeric) {
    const [integer, cents] = numeric[0].split(/,(?=\d{1,2}$)/);
    const value = Number(`${integer.replace(/[.,]/g, '')}${cents ? `.${cents}` : ''}`);
    return value > 0 ? value : null;
  }

  return wordsToNumber(normalized);
}

export function parseQuantity(text) {
  const amount = parseAmount(text);
  return amount && amount > 0 ? amount : 1;
}

export const isAffirmative = (text) => AFFIRMATIVE.test(String(text ?? '').trim());
export const isNegative = (text) => NEGATIVE.test(String(text ?? '').trim());

function wordsToNumber(text) {
  let total = 0;
  let found = false;
  for (const word of text.split(/[\s-]+/)) {
    if (word === 'mil') {
      total = (total || 1) * 1000;
      found = true;
    } else if (word in NUMBER_WORDS) {
      total += NUMBER_WORDS[word];
      found = true;
    }
  }
  return found && total > 0 ? total : null;
}

function clean(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}
