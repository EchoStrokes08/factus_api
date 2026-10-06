import * as rangesApi from '../api/factusNumberingRangesClient.js';
import { withFactusToken } from './tokenManager.js';
import { toNumberingRangeView, unwrapPage } from './mappers/factusMapper.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

/**
 * Resuelve que rango de numeracion DIAN usar para cada tipo de documento.
 *
 * Factus exige `numbering_range_id` en cuanto la cuenta tiene mas de un rango
 * activo (lo normal: uno de facturas y otro de notas credito). En lugar de
 * pedirle ese id al usuario, se consulta GET /v2/numbering-ranges y se elige
 * el rango que de verdad sirve hoy:
 *   activo · no vencido · no eliminado · vigente por fechas · con numeros libres
 * y, si hay varios, el de vigencia mas larga. El resultado se cachea unos
 * minutos para no consultar Factus en cada factura.
 *
 * FACTUS_BILL_RANGE_ID / FACTUS_CREDIT_NOTE_RANGE_ID permiten fijarlo a mano.
 */

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_PAGES = 5;

const DOCUMENT_KINDS = {
  bill: {
    label: 'facturas',
    codes: ['21'],
    matches: (name) => /factura/i.test(name) && !/nota|soporte|n[oó]mina|talonario|papel|contingencia/i.test(name),
  },
  creditNote: {
    label: 'notas crédito',
    codes: ['22'],
    matches: (name) => /nota\s*(de\s*)?cr[eé]dito/i.test(name),
  },
};

let cache = null; // { at, ranges }

/** Todos los rangos activos de la cuenta, ya normalizados. */
export async function listActiveRanges({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.ranges;

  const ranges = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await withFactusToken((token) => rangesApi.list(token, { 'filter[is_active]': 1, page }));
    const { rows, pagination } = unwrapPage(response);
    ranges.push(...rows.map(toNumberingRangeView));
    if (!pagination || page >= Number(pagination.last_page || 1)) break;
  }

  cache = { at: Date.now(), ranges };
  return ranges;
}

/** El rango que se usara para `kind` ('bill' | 'creditNote'), o null si no hay. */
export async function findRangeFor(kind, options) {
  const ranges = await listActiveRanges(options);
  return pickRange(ranges, kind);
}

/**
 * Id a enviar en `numbering_range_id`. Para facturas es obligatorio encontrar
 * uno; para notas credito, si la cuenta no tiene rango propio, se omite y
 * Factus usa el unico disponible.
 */
export async function resolveRangeId(kind) {
  const override = kind === 'bill' ? env.factus.billRangeId : env.factus.creditNoteRangeId;
  if (override) return Number(override);

  const range = await findRangeFor(kind);
  if (range) return range.id;

  if (kind === 'creditNote') {
    logger.warn('numberingRangeService', 'No hay rango activo de notas credito; Factus usara su rango por defecto');
    return undefined;
  }
  throw new ApiError(
    'Factus no tiene un rango de numeración de facturas activo y vigente. Actívalo o créalo en el panel de Factus.',
    { source: 'numberingRangeService', statusCode: 409 },
  );
}

/** Obliga a reconsultar Factus (p. ej. despues de que rechace un rango). */
export function invalidateRangeCache() {
  cache = null;
}

/**
 * Resumen para la interfaz: que rango se esta usando para cada documento.
 * Siempre consulta Factus (y refresca la cache) para que el consecutivo y
 * los folios libres que ve el usuario sean los reales.
 */
export async function describeRanges() {
  const ranges = await listActiveRanges({ fresh: true });
  return {
    bill: pickRange(ranges, 'bill'),
    creditNote: pickRange(ranges, 'creditNote'),
    active: ranges,
  };
}

export function pickRange(ranges, kind, today = new Date().toISOString().slice(0, 10)) {
  const spec = DOCUMENT_KINDS[kind];
  return (
    ranges
      .filter((range) => (range.document_code ? spec.codes.includes(String(range.document_code)) : spec.matches(range.document)))
      .filter((range) => isUsable(range, today))
      .sort((a, b) => (b.end_date ?? '').localeCompare(a.end_date ?? '') || b.id - a.id)[0] ?? null
  );
}

function isUsable(range, today) {
  if (!range.is_active || range.is_expired || range.is_deleted) return false;
  if (range.end_date && range.end_date.slice(0, 10) < today) return false;
  if (range.start_date && range.start_date.slice(0, 10) > today) return false;
  if (range.remaining === 0) return false;
  return true;
}
