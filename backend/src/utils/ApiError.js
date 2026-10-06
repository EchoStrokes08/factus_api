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
    if (!error.response) {
      const reason = error.code === 'ECONNABORTED' ? 'tardo demasiado en responder' : 'no respondio';
      return new ApiError(`El servicio ${source} ${reason}. Intenta de nuevo en un momento.`, {
        source,
        statusCode: 504,
      });
    }

    const statusCode = error.response.status;
    const details = error.response.data || null;
    const base = details?.message || details?.error || `Error ${statusCode} en ${source}`;
    const firstValidation = firstErrorMessage(details?.data?.errors ?? details?.errors);
    const message = firstValidation && !base.includes(firstValidation) ? `${base}: ${firstValidation}` : base;

    return new ApiError(message, { source, statusCode, details });
  }
}

/**
 * Factus devuelve los rechazos como `{ errors: { campo: ["msg"] } }` o como
 * lista de reglas DIAN ("FAK24: Regla..., Rechazo: ..."). Se toma el primero
 * para que el mensaje que oye el usuario diga QUE fallo, no solo "422".
 */
function firstErrorMessage(errors) {
  if (!errors) return null;
  if (typeof errors === 'string') return errors;
  const values = Array.isArray(errors) ? errors : Object.values(errors);
  for (const value of values) {
    const text = Array.isArray(value) ? value[0] : value;
    if (typeof text === 'string' && text.trim()) return text.trim();
  }
  return null;
}
