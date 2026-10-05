/**
 * Error tipado para distinguir, al depurar, si un fallo vino de la capa de
 * acceso a una API externa (Factus / Factus Pay / Anthropic) o de la logica
 * de negocio propia. `source` y `statusCode` se usan en el errorHandler
 * para responder al frontend de forma consistente.
 */
export class ApiError extends Error {
  constructor(message, { source = 'app', statusCode = 500, details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.source = source;
    this.statusCode = statusCode;
    this.details = details;
  }

  static fromAxiosError(error, source) {
    const statusCode = error.response?.status || 502;
    const details = error.response?.data || null;
    const message =
      details?.message ||
      details?.error ||
      error.message ||
      `Error al comunicarse con ${source}`;
    return new ApiError(message, { source, statusCode, details });
  }
}
