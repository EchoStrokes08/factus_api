/**
 * Datos y helpers de simulacion. Se usan solo cuando MOCK_MODE=true, para
 * poder desarrollar y probar el agente de voz sin credenciales reales de
 * Factus. La forma de las respuestas imita la documentada por Factus para
 * que el resto del backend/frontend no distinga si esta en modo mock o real.
 */

let billCounter = 1000;
let creditNoteCounter = 500;

const bills = new Map();
const creditNotes = new Map();
const collections = new Map();

export function mockLogin() {
  return {
    token_type: 'Bearer',
    expires_in: 600,
    access_token: `mock-access-token-${Date.now()}`,
    refresh_token: `mock-refresh-token-${Date.now()}`,
  };
}

export function mockPayLogin() {
  return { token: `mock-pay-token-${Date.now()}` };
}

export function mockCreateBill(payload) {
  billCounter += 1;
  const number = `SETP990000${billCounter}`;
  const record = {
    status: 'success',
    message: 'Factura creada y validada (simulada)',
    data: {
      number,
      cufe: `mock-cufe-${billCounter}`,
      reference_code: payload.reference_code,
      is_validated: true,
      validated_at: new Date().toLocaleString('es-CO'),
      created_at: new Date().toISOString(),
      customer: payload.customer,
      items: payload.items,
      payment_details: payload.payment_details,
      totals: computeTotals(payload.items),
      links: {
        qr: null,
        public_url: `https://factura-sandbox.factus.local/${number}`,
      },
    },
  };
  bills.set(payload.reference_code, record);
  return record;
}

export function mockDeleteBill(referenceCode) {
  const existed = bills.delete(referenceCode);
  return { status: 'success', message: existed ? 'Factura eliminada (simulada)' : 'No existia, nada que eliminar' };
}

export function mockCreateCreditNote(payload) {
  creditNoteCounter += 1;
  const number = `NC990000${creditNoteCounter}`;
  const record = {
    status: 'success',
    message: 'Nota credito creada y validada (simulada)',
    data: {
      number,
      cufe: `mock-cufe-nc-${creditNoteCounter}`,
      reference_code: payload.reference_code,
      bill_number: payload.bill_number,
      is_validated: true,
      created_at: new Date().toISOString(),
      items: payload.items,
      totals: computeTotals(payload.items),
    },
  };
  creditNotes.set(payload.reference_code, record);
  return record;
}

export function mockDeleteCreditNote(referenceCode) {
  const existed = creditNotes.delete(referenceCode);
  return { status: 'success', message: existed ? 'Nota credito eliminada (simulada)' : 'No existia, nada que eliminar' };
}

export function mockCreateCollection({ reference_code, amount }) {
  const isNew = !collections.has(reference_code);
  const record = {
    status: 'success',
    message: isNew ? 'Recaudo creado (simulado)' : 'Recaudo existente (simulado)',
    data: {
      reference_code,
      amount,
      status: isNew ? 'started' : 'ready',
      created_at: new Date().toISOString(),
      collection_url: `https://pay-sandbox.factus.local/collections/${reference_code}`,
      qr: isNew ? null : 'mock-qr-base64',
    },
  };
  collections.set(reference_code, record);
  return record;
}

export function mockListBills() {
  return { status: 'success', data: Array.from(bills.values()).map((r) => r.data) };
}

export function mockListCreditNotes() {
  return { status: 'success', data: Array.from(creditNotes.values()).map((r) => r.data) };
}

function computeTotals(items = []) {
  const gross = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const taxRate = Number(items[0]?.taxes?.[0]?.rate ?? 0) / 100;
  const tax = gross * taxRate;
  return {
    gross_amount: gross.toFixed(2),
    taxable_amount: gross.toFixed(2),
    tax_amount: tax.toFixed(2),
    total: (gross + tax).toFixed(2),
  };
}
