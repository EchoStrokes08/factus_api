/**
 * Traduce la query de nuestra API (?reference_code=...&page=2) a los filtros
 * que documenta Factus (filter[reference_code], page). Solo pasan los
 * permitidos: nada arbitrario del cliente llega a la API de Factus.
 */
const ALLOWED = ['identification', 'names', 'number', 'prefix', 'reference_code', 'status'];

export function toFactusFilters(query = {}) {
  const filters = {};
  for (const key of ALLOWED) {
    if (query[key] != null && query[key] !== '') filters[`filter[${key}]`] = String(query[key]);
  }
  const page = Number(query.page);
  if (Number.isInteger(page) && page > 0) filters.page = page;
  return filters;
}
