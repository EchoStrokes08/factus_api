import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    status: 'error',
    source: 'app',
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const isApiError = err instanceof ApiError;
  const statusCode = isApiError ? err.statusCode : 500;
  const source = isApiError ? err.source : 'app';

  logger.error(source, err.message, isApiError ? err.details : err.stack);

  res.status(statusCode).json({
    status: 'error',
    source,
    message: err.message || 'Error interno del servidor',
    details: isApiError ? err.details : undefined,
  });
}
