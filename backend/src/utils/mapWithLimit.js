/**
 * Como Promise.all(items.map(fn)), pero con a lo sumo `limit` llamadas en
 * vuelo: evita disparar decenas de peticiones simultaneas contra Factus.
 */
export async function mapWithLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
