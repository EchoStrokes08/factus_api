import * as collectionService from '../services/collectionService.js';

/** Recaudos de Factus Pay (filtros: status, reference_code, page). */
export async function list(req, res) {
  const result = await collectionService.listCollections(req.query);
  res.json({ status: 'success', data: result });
}

/** Un recaudo con su QR de pago (GET /v1/collections/:reference_code). */
export async function get(req, res) {
  const result = await collectionService.getCollection(req.params.referenceCode);
  res.json({ status: 'success', data: result });
}
