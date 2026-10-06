import * as numberingRangeService from '../services/numberingRangeService.js';

/** Rangos activos en Factus y cual se usa para facturas y notas credito. */
export async function summary(req, res) {
  const result = await numberingRangeService.describeRanges();
  res.json({ status: 'success', data: result });
}
