import 'dotenv/config';

function bool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

/**
 * Credenciales de SANDBOX incluidas a proposito para que la app funcione
 * sin configurar nada (local y Vercel). Cualquier variable de entorno las
 * reemplaza. No poner aqui credenciales de produccion: este archivo es publico.
 */
const SANDBOX_DEFAULTS = {
  factus: {
    clientId: 'REMOVIDO',
    clientSecret: 'REMOVIDO',
    username: 'REMOVIDO',
    password: 'REMOVIDO',
  },
  factusPay: {
    email: 'REMOVIDO',
    password: 'REMOVIDO',
  },
};

const mockMode = bool(process.env.MOCK_MODE, false);

export const env = {
  port: Number(process.env.PORT) || 4000,
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  mockMode,

  factus: {
    baseUrl: process.env.FACTUS_BASE_URL || 'https://api-sandbox.factus.com.co',
    clientId: process.env.FACTUS_CLIENT_ID || SANDBOX_DEFAULTS.factus.clientId,
    clientSecret: process.env.FACTUS_CLIENT_SECRET || SANDBOX_DEFAULTS.factus.clientSecret,
    username: process.env.FACTUS_USERNAME || SANDBOX_DEFAULTS.factus.username,
    password: process.env.FACTUS_PASSWORD || SANDBOX_DEFAULTS.factus.password,
    // Opcionales: vacios = el rango se resuelve con GET /v2/numbering-ranges.
    billRangeId: process.env.FACTUS_BILL_RANGE_ID || '',
    creditNoteRangeId: process.env.FACTUS_CREDIT_NOTE_RANGE_ID || '',
  },

  factusPay: {
    // Independiente de MOCK_MODE: permite facturas simuladas con cobros reales
    // en el sandbox de Factus Pay. Si no se define, sigue a MOCK_MODE.
    mockMode: bool(process.env.FACTUS_PAY_MOCK_MODE, mockMode),
    baseUrl: process.env.FACTUS_PAY_BASE_URL || 'https://pay-api-sandbox.factus.com.co',
    email: process.env.FACTUS_PAY_EMAIL || SANDBOX_DEFAULTS.factusPay.email,
    password: process.env.FACTUS_PAY_PASSWORD || SANDBOX_DEFAULTS.factusPay.password,
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
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
