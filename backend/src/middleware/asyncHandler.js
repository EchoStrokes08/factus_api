/**
 * Envuelve controladores async para que cualquier rechazo llegue al
 * errorHandler central en vez de quedar como una promesa no manejada.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
