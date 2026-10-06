import 'dotenv/config';

function bool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

/**
 * Las credenciales SOLO vienen de variables de entorno: backend/.env en local
 * (ignorado por git) y Project Settings > Environment Variables en Vercel.
 * Nunca escribir credenciales en este archivo: el repositorio es publico.
 */
const DEFAULTS = {
  // Endpoint de OpenRouter compatible con la API de Anthropic. Sin
  // ANTHROPIC_API_KEY se usa el asistente guiado.
  anthropic: {
    model: 'anthropic/claude-sonnet-4.5',
    baseUrl: 'https://openrouter.ai/api',
  },
};

const mockMode = bool(process.env.MOCK_MODE, false);

export const env = {
  port: Number(process.env.PORT) || 4000,
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  mockMode,

  factus: {
    baseUrl: process.env.FACTUS_BASE_URL || 'https://api-sandbox.factus.com.co',
    clientId: process.env.FACTUS_CLIENT_ID || '',
    clientSecret: process.env.FACTUS_CLIENT_SECRET || '',
    username: process.env.FACTUS_USERNAME || '',
    password: process.env.FACTUS_PASSWORD || '',
    // Opcionales: vacios = el rango se resuelve con GET /v2/numbering-ranges.
    billRangeId: process.env.FACTUS_BILL_RANGE_ID || '',
    creditNoteRangeId: process.env.FACTUS_CREDIT_NOTE_RANGE_ID || '',
  },

  factusPay: {
    // Independiente de MOCK_MODE: permite facturas simuladas con cobros reales
    // en el sandbox de Factus Pay. Si no se define, sigue a MOCK_MODE.
    mockMode: bool(process.env.FACTUS_PAY_MOCK_MODE, mockMode),
    baseUrl: process.env.FACTUS_PAY_BASE_URL || 'https://pay-api-sandbox.factus.com.co',
    email: process.env.FACTUS_PAY_EMAIL || '',
    password: process.env.FACTUS_PAY_PASSWORD || '',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    // Endpoint compatible con la API de Anthropic (p. ej. OpenRouter).
    baseUrl: process.env.ANTHROPIC_BASE_URL || DEFAULTS.anthropic.baseUrl,
    model: process.env.ANTHROPIC_MODEL || DEFAULTS.anthropic.model,
  },
};

export function assertFactusCredentials() {
  const missing = Object.entries({
    FACTUS_CLIENT_ID: env.factus.clientId,
    FACTUS_CLIENT_SECRET: env.factus.clientSecret,
    FACTUS_USERNAME: env.factus.username,
    FACTUS_PASSWORD: env.factus.password,
  })
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Faltan variables de entorno de Factus: ${missing.join(', ')}`);
  }
}

export function assertFactusPayCredentials() {
  const missing = Object.entries({
    FACTUS_PAY_EMAIL: env.factusPay.email,
    FACTUS_PAY_PASSWORD: env.factusPay.password,
  })
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`Faltan variables de entorno de Factus Pay: ${missing.join(', ')}`);
  }
}
