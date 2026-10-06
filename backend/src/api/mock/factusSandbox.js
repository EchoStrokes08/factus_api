import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';

/**
 * Simulador de Factus v2 y Factus Pay v1 (MOCK_MODE=true).
 *
 * El estado se guarda en disco (MOCK_DATA_FILE, por defecto
 * backend/.data/factus-sandbox.json): con FACTUS_PAY_MOCK_MODE=false los
 * cobros viven en el sandbox real de Factus Pay, y si las facturas simuladas
 * se perdieran al reiniciar, quedarian recaudos huerfanos y la numeracion
 * volveria a empezar con folios repetidos. Si el disco no es escribible
 * (serverless), sigue funcionando solo en memoria.
 *
 * No es un "devuelve success siempre": reproduce las reglas que importan
 * para que el resto del backend se comporte igual que contra el sandbox real:
 *   - Las facturas solo se numeran con un rango activo, vigente y de facturas.
 *   - Una factura validada (con CUFE) NO se puede destruir: responde 409,
 *     igual que Factus, y hay que anularla con nota credito (concepto 2).
 *   - Un reference_code repetido devuelve el documento existente.
 *   - Factus Pay rechaza montos fuera de 10.000 - 12.000.000 COP y el QR
 *     aparece unos segundos despues de crear el recaudo (started -> ready).
 *
 * Las formas de respuesta siguen la documentacion de developers.factus.com.co
 * y pay-developers.factus.com.co.
 */

const SOURCE = 'factus.sandbox';
const COLLECTION_READY_AFTER_MS = 4000;

const today = () => new Date().toISOString().slice(0, 10);
const yearsFromNow = (years) => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().slice(0, 10);
};

const numberingRanges = [
  {
    id: 7,
    document: 'Factura electrónica de venta',
    prefix: 'SETT',
    resolution_number: '18760000000',
    from: 1,
    to: 1000,
    current: 1000,
    start_date: '2023-01-01',
    end_date: '2024-12-31',
    technical_key: 'mock-technical-key-expired',
    is_expired: true,
    is_active: false,
    is_external: false,
    deleted_at: null,
  },
  {
    id: 8,
    document: 'Factura electrónica de venta',
    prefix: 'SETP',
    resolution_number: '18760000001',
    from: 990000000,
    to: 995000000,
    current: 990001042,
    start_date: '2025-01-01',
    end_date: yearsFromNow(2),
    technical_key: 'mock-technical-key-bills',
    is_expired: false,
    is_active: true,
    is_external: false,
    deleted_at: null,
  },
  {
    id: 9,
    document: 'Nota Crédito',
    prefix: 'NC',
    resolution_number: null,
    from: 1,
    to: 9999999,
    current: 518,
    start_date: '2025-01-01',
    end_date: yearsFromNow(2),
    technical_key: null,
    is_expired: false,
    is_active: true,
    is_external: false,
    deleted_at: null,
  },
];

const bills = new Map(); // number -> detalle
const creditNotes = new Map(); // number -> detalle
const collections = new Map(); // reference_code -> recaudo

/* ----------------------------------------------------------- persistencia */

// En Vercel solo /tmp es escribible, y dura lo que viva la instancia.
const DATA_FILE =
  process.env.MOCK_DATA_FILE ||
  (process.env.VERCEL
    ? '/tmp/factus-sandbox.json'
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.data/factus-sandbox.json'));
let persistenceWarned = false;

function restore() {
  let saved;
  try {
    saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') logger.warn(SOURCE, `No se pudo leer ${DATA_FILE}; se empieza vacío`, error.message);
    return;
  }
  for (const range of numberingRanges) {
    const current = saved.rangeCurrents?.[range.id];
    if (Number.isInteger(current) && current > range.current) range.current = current;
  }
  for (const bill of saved.bills ?? []) bills.set(bill.number, bill);
  for (const note of saved.creditNotes ?? []) creditNotes.set(note.number, note);
  for (const record of saved.collections ?? []) collections.set(record.reference_code, record);
}

function persist() {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const snapshot = {
      rangeCurrents: Object.fromEntries(numberingRanges.map((range) => [range.id, range.current])),
      bills: [...bills.values()],
      creditNotes: [...creditNotes.values()],
      collections: [...collections.values()],
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(snapshot, null, 2));
  } catch (error) {
    if (!persistenceWarned) logger.warn(SOURCE, 'El simulador no puede guardar en disco; los datos viven solo en memoria', error.message);
    persistenceWarned = true;
  }
}

restore();

/* ------------------------------------------------------------------ auth */

export function login() {
  return {
    token_type: 'Bearer',
    expires_in: 3600,
    access_token: `mock-access-token-${Date.now()}`,
    refresh_token: `mock-refresh-token-${Date.now()}`,
  };
}

export function payLogin() {
  return { token: `mock-pay-token-${Date.now()}` };
}

/* ------------------------------------------------------ numbering ranges */

export function listNumberingRanges(params = {}) {
  const onlyActive = String(params['filter[is_active]'] ?? '') === '1';
  const data = numberingRanges.filter((range) => !onlyActive || range.is_active);
  return { data, pagination: pagination(data.length) };
}

/* ----------------------------------------------------------------- bills */

export function createBill(payload) {
  const existing = findByReference(bills, payload.reference_code);
  if (existing) return envelope(`Documento con el código de referencia ${payload.reference_code} ya existe`, existing);

  const range = takeNumber(payload.numbering_range_id, 'factura', isBillRange);
  const totals = computeTotals(payload.items);
  const number = `${range.prefix}${range.current}`;

  const bill = {
    id: bills.size + 1,
    number,
    prefix: range.prefix,
    reference_code: payload.reference_code,
    cufe: `mock-cufe-${fakeHash(number)}`,
    is_validated: true,
    status: 1,
    validated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    observation: payload.observation ?? null,
    numbering_range: pick(range, ['id', 'prefix', 'from', 'to', 'resolution_number', 'start_date', 'end_date']),
    customer: echoCustomer(payload.customer),
    items: payload.items.map(echoItem),
    payment_details: payload.payment_details,
    totals,
    links: { qr: null, public_url: null },
    credit_notes: [],
  };

  bills.set(number, bill);
  persist();
  return envelope(`Documento con el código de referencia ${payload.reference_code} registrado y validado con éxito`, bill);
}

export function listBills(params = {}) {
  const rows = filterRows([...bills.values()], params).map((bill) => ({
    id: bill.id,
    number: bill.number,
    reference_code: bill.reference_code,
    identification: bill.customer.identification,
    graphic_representation_name: bill.customer.names || bill.customer.company,
    names: bill.customer.names,
    company: bill.customer.company,
    total: bill.totals.total,
    status: bill.status,
    cufe: bill.cufe,
    created_at: bill.created_at,
    credit_notes: bill.credit_notes,
  }));
  return { status: 'OK', message: 'Solicitud exitosa', data: { data: rows, pagination: pagination(rows.length) } };
}

export function getBill(number) {
  const bill = bills.get(String(number));
  if (!bill) throw notFound(`No se encontró la factura ${number}`);
  return envelope('Solicitud exitosa', bill);
}

export function destroyBill(referenceCode) {
  const bill = findByReference(bills, referenceCode);
  if (!bill) throw notFound(`No existe una factura con código de referencia ${referenceCode}`);
  if (bill.is_validated) {
    throw new ApiError(`La factura ${bill.number} ya fue validada por la DIAN y no se puede eliminar`, {
      source: SOURCE,
      statusCode: 409,
    });
  }
  bills.delete(bill.number);
  persist();
  return { status: 'OK', message: 'Documento eliminado con éxito' };
}

export function downloadBillPdf(number) {
  getBill(number);
  throw new ApiError('El PDF oficial solo existe en Factus real (MOCK_MODE=false)', { source: SOURCE, statusCode: 501 });
}

/* ---------------------------------------------------------- credit notes */

export function createCreditNote(payload) {
  const existing = findByReference(creditNotes, payload.reference_code);
  if (existing) return envelope(`Documento con el código de referencia ${payload.reference_code} ya existe`, existing);

  const bill = bills.get(String(payload.bill_number));
  if (!bill) throw unprocessable(`La factura ${payload.bill_number} no existe`);
  if (!bill.is_validated) throw unprocessable(`La factura ${payload.bill_number} no está validada ante la DIAN`);

  const range = takeNumber(payload.numbering_range_id, 'nota crédito', isCreditNoteRange);
  const number = `${range.prefix}${range.current}`;
  const note = {
    id: creditNotes.size + 1,
    number,
    prefix: range.prefix,
    reference_code: payload.reference_code,
    bill_number: bill.number,
    correction_concept_code: payload.correction_concept_code,
    cufe: `mock-cude-${fakeHash(number)}`,
    is_validated: true,
    status: 1,
    validated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    observation: payload.observation ?? null,
    customer: bill.customer,
    items: payload.items.map(echoItem),
    totals: computeTotals(payload.items),
  };

  creditNotes.set(number, note);
  bill.credit_notes.push({ number, reference_code: note.reference_code, correction_concept_code: note.correction_concept_code });
  persist();
  return envelope(`Documento con el código de referencia ${payload.reference_code} registrado y validado con éxito`, note);
}

export function listCreditNotes(params = {}) {
  const rows = filterRows([...creditNotes.values()], params).map((note) => ({
    id: note.id,
    number: note.number,
    reference_code: note.reference_code,
    bill_number: note.bill_number,
    correction_concept_code: note.correction_concept_code,
    identification: note.customer.identification,
    names: note.customer.names,
    company: note.customer.company,
    total: note.totals.total,
    status: note.status,
    cufe: note.cufe,
    created_at: note.created_at,
  }));
  return { status: 'OK', message: 'Solicitud exitosa', data: { data: rows, pagination: pagination(rows.length) } };
}

export function destroyCreditNote(referenceCode) {
  const note = findByReference(creditNotes, referenceCode);
  if (!note) throw notFound(`No existe una nota crédito con código de referencia ${referenceCode}`);
  if (note.is_validated) {
    throw new ApiError(`La nota crédito ${note.number} ya fue validada por la DIAN y no se puede eliminar`, {
      source: SOURCE,
      statusCode: 409,
    });
  }
  creditNotes.delete(note.number);
  persist();
  return { status: 'OK', message: 'Documento eliminado con éxito' };
}

/* ------------------------------------------------------- Factus Pay */

export function createCollection({ reference_code, amount }) {
  if (!(amount >= 10000 && amount <= 12000000)) {
    throw new ApiError('El monto del recaudo debe estar entre 10.000 y 12.000.000 COP', {
      source: 'factusPay.collections',
      statusCode: 422,
    });
  }
  const existing = collections.get(reference_code);
  if (existing) return { status: 'success', message: 'Recaudo ya existente', data: collectionState(existing) };

  const record = { reference_code, amount, created_at: new Date().toISOString(), createdAtMs: Date.now() };
  collections.set(reference_code, record);
  persist();
  return { status: 'success', message: 'Recaudo creado correctamente', data: collectionState(record) };
}

export function getCollection(referenceCode) {
  const record = collections.get(referenceCode);
  if (!record) {
    throw new ApiError('Recaudo no encontrado', { source: 'factusPay.collections', statusCode: 404 });
  }
  return { status: 'success', message: 'Recaudo encontrado', data: collectionState(record) };
}

export function listCollections(params = {}) {
  const data = [...collections.values()]
    .map(collectionState)
    .filter((row) => !params.status || row.status === params.status)
    .filter((row) => !params.reference_code || row.reference_code === params.reference_code)
    .map(({ qr, ...row }) => row)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return {
    data,
    meta: { current_page: 1, last_page: 1, per_page: 15, total: data.length },
    status: 'success',
    message: 'Recaudos obtenidos correctamente',
  };
}

/* ------------------------------------------------------------- helpers */

function collectionState(record) {
  const ready = Date.now() - record.createdAtMs >= COLLECTION_READY_AFTER_MS;
  // En simulacion no hay pasarela real que genere un QR cobrable.
  return {
    reference_code: record.reference_code,
    amount: record.amount,
    status: ready ? 'ready' : 'started',
    created_at: record.created_at,
    qr: null,
  };
}

function isBillRange(range) {
  return /factura/i.test(range.document) && !/nota/i.test(range.document);
}

function isCreditNoteRange(range) {
  return /nota\s*cr[eé]dito/i.test(range.document);
}

function takeNumber(rangeId, label, matchesDocument) {
  const active = numberingRanges.filter((range) => range.is_active && matchesDocument(range));
  const range = rangeId == null && active.length === 1 ? active[0] : numberingRanges.find((r) => r.id === Number(rangeId));

  if (!range) throw unprocessable(`El rango de numeración ${rangeId ?? '(no enviado)'} no existe o es ambiguo para ${label}`);
  if (!matchesDocument(range)) throw unprocessable(`El rango ${range.id} no corresponde a ${label}`);
  if (!range.is_active || range.is_expired || range.end_date < today()) {
    throw unprocessable(`El rango de numeración ${range.id} (${range.prefix}) no está activo o está vencido`);
  }
  if (range.current > range.to) throw unprocessable(`El rango ${range.id} (${range.prefix}) ya agotó su numeración`);

  const taken = { ...range };
  range.current += 1;
  return taken;
}

function computeTotals(items = []) {
  let gross = 0;
  let tax = 0;
  for (const item of items) {
    const base = round2(Number(item.price) * Number(item.quantity) * (1 - Number(item.discount_rate || 0) / 100));
    gross += base;
    tax += round2(base * (Number(item.taxes?.[0]?.rate ?? 0) / 100));
  }
  return {
    gross_amount: gross.toFixed(2),
    taxable_amount: gross.toFixed(2),
    tax_amount: tax.toFixed(2),
    total: (gross + tax).toFixed(2),
  };
}

function echoCustomer(customer = {}) {
  return {
    ...customer,
    identification_document: { code: customer.identification_document_code },
    legal_organization: { code: customer.legal_organization_code },
    municipality: { code: customer.municipality_code },
  };
}

function echoItem(item) {
  return {
    code_reference: item.code_reference,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    discount_rate: item.discount_rate ?? '0.00',
    unit_measure: { code: item.unit_measure_code },
    standard_code: { code: item.standard_code },
    taxes: item.taxes,
  };
}

function filterRows(rows, params) {
  const reference = params['filter[reference_code]'];
  const number = params['filter[number]'];
  const billNumber = params['filter[bill_number]'];
  return rows
    .filter((row) => !reference || row.reference_code === reference)
    .filter((row) => !number || row.number === number)
    .filter((row) => !billNumber || row.bill_number === billNumber)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function findByReference(store, referenceCode) {
  for (const doc of store.values()) if (doc.reference_code === referenceCode) return doc;
  return null;
}

function envelope(message, data) {
  return { status: 'Created', message, data: structuredClone(data) };
}

function pagination(total) {
  return { total, per_page: Math.max(total, 10), current_page: 1, last_page: 1, from: total ? 1 : 0, to: total };
}

function pick(source, keys) {
  return Object.fromEntries(keys.map((key) => [key, source[key]]));
}

function fakeHash(seed) {
  let hash = 0;
  for (const char of `${seed}-${Date.now()}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash.toString(16).padStart(8, '0').repeat(6);
}

const round2 = (value) => Math.round(value * 100) / 100;
const notFound = (message) => new ApiError(message, { source: SOURCE, statusCode: 404 });
const unprocessable = (message) => new ApiError(message, { source: SOURCE, statusCode: 422 });
