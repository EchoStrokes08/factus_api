import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    status: 'error',
    source: 'app',
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
}

// Express reconoce el middleware de error por sus 4 parametros.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const error = normalize(err);
  // La traza solo aporta en fallos propios; los de Factus ya traen su detalle.
  logger.error(error.source, error.message, err instanceof ApiError ? error.details ?? '' : err?.stack);

  res.status(error.statusCode).json({
    status: 'error',
    source: error.source,
    message: error.message,
    details: error.details ?? undefined,
  });
}

function normalize(err) {
  if (err instanceof ApiError) return err;
  // Errores del body-parser de Express (JSON malformado, cuerpo enorme).
  if (err?.type === 'entity.parse.failed') {
    return new ApiError('El cuerpo de la petición no es un JSON válido', { source: 'app', statusCode: 400 });
  }
  if (err?.type === 'entity.too.large') {
    return new ApiError('La petición es demasiado grande', { source: 'app', statusCode: 413 });
  }
  if (/^Faltan variables de entorno/.test(err?.message ?? '')) {
    return new ApiError(err.message, { source: 'config', statusCode: 503 });
  }
  return new ApiError('Error interno del servidor', { source: 'app', statusCode: 500 });
}
