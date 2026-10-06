import { CREDIT_NOTE_CONCEPT_LABEL } from '../../config/catalogs.js';

/**
 * Traduce las respuestas de Factus a las "vistas" estables que consume el
 * frontend y el agente. Factus no es del todo uniforme entre endpoints:
 *   - el detalle puede venir plano (`data.number`) o anidado (`data.bill`),
 *   - los catalogos vienen como codigo ("94") o como objeto ({ code, name }),
 *   - el listado pagina como `{ data: { data: [...] } }` o `{ data: [...] }`,
 *   - "validada" puede expresarse con is_validated, status = 1 o el CUFE.
 * Toda esa variacion se absorbe aqui, en funciones puras, y nada mas en el
 * sistema necesita conocerla.
 */

/** Extrae la lista y la paginacion de cualquier respuesta paginada de Factus. */
export function unwrapPage(response) {
  const body = response?.data ?? response;
  const rows = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
  const pagination = body?.pagination ?? response?.pagination ?? null;
  return { rows, pagination };
}

/** Extrae el documento de una respuesta de detalle/creacion. */
export function unwrapDocument(response) {
  const body = response?.data ?? response ?? {};
  // Solo se desanida si el documento no viene en la raiz: la nota credito
  // real es plana y su `bill` es la referencia a la factura que corrige.
  if (!body.number && (body.bill || body.credit_note)) {
    const core = body.credit_note || body.bill;
    return { ...body, ...core, customer: body.customer ?? core.customer, items: body.items ?? core.items };
  }
  return body;
}

export function toInvoiceView(raw = {}) {
  const items = (raw.items || []).map(toItemView);
  const totals = toTotals(raw, items);

  return {
    number: raw.number ?? null,
    reference_code: raw.reference_code ?? null,
    prefix: raw.prefix ?? raw.numbering_range?.prefix ?? null,
    cufe: raw.cufe ?? null,
    is_validated: isValidated(raw),
    created_at: raw.created_at ?? null,
    validated_at: typeof raw.validated_at === 'string' ? raw.validated_at : null,
    customer: toCustomerView(raw),
    items,
    totals,
    numbering_range: raw.numbering_range
      ? {
          prefix: raw.numbering_range.prefix ?? null,
          resolution_number: raw.numbering_range.resolution_number ?? null,
        }
      : null,
    // El detalle real trae las notas en related_notes.credit_notes.
    voided_by: creditNoteNumbers(raw.credit_notes ?? raw.related_notes?.credit_notes, { onlyCancellations: true }),
    // Todas sus notas, con o sin concepto: el frontend las cruza con el listado de notas.
    credit_note_numbers: creditNoteNumbers(raw.credit_notes ?? raw.related_notes?.credit_notes, { onlyCancellations: false }),
    public_url: httpsUrl(raw.public_url ?? raw.links?.public_url),
    dian_qr: httpsUrl(raw.qr ?? raw.links?.qr),
  };
}

export function toCreditNoteView(raw = {}) {
  const items = (raw.items || []).map(toItemView);
  const concept = String(codeOf(raw.correction_concept_code ?? raw.correction_concept) ?? '');

  return {
    number: raw.number ?? null,
    reference_code: raw.reference_code ?? null,
    bill_number: raw.bill_number ?? raw.bill?.number ?? raw.billing_reference?.number ?? null,
    cufe: raw.cufe ?? raw.cude ?? null,
    is_validated: isValidated(raw),
    created_at: raw.created_at ?? null,
    concept_code: concept || null,
    concept_label: CREDIT_NOTE_CONCEPT_LABEL[concept] ?? null,
    customer: toCustomerView(raw),
    items,
    totals: toTotals(raw, items),
  };
}

export function toNumberingRangeView(raw = {}) {
  const documentName = typeof raw.document === 'object' ? raw.document?.name : raw.document;
  const documentCode = typeof raw.document === 'object' ? raw.document?.code : null;
  const to = toNumber(raw.to);
  const current = toNumber(raw.current);

  return {
    id: raw.id,
    document: documentName ?? '',
    document_code: documentCode ?? raw.document_code ?? null,
    prefix: raw.prefix ?? '',
    resolution_number: raw.resolution_number ?? null,
    from: toNumber(raw.from),
    to,
    current,
    remaining: to != null && current != null ? Math.max(to - current + 1, 0) : null,
    start_date: raw.start_date ?? null,
    end_date: raw.end_date ?? null,
    is_active: truthy(raw.is_active),
    is_expired: truthy(raw.is_expired),
    is_deleted: Boolean(raw.deleted_at),
  };
}

/** Recaudo de Factus Pay: started -> ready (ya hay QR) -> paid. */
export function toCollectionView(response) {
  const data = response?.data ?? response ?? {};
  return {
    status: data.status ?? 'unknown',
    reference_code: data.reference_code ?? null,
    amount: toNumber(data.amount),
    created_at: data.created_at ?? null,
    qr: typeof data.qr === 'string' && data.qr.startsWith('data:image/') ? data.qr : null,
    reason: null,
  };
}

/** Un documento esta validado si Factus lo dice o si ya tiene CUFE de la DIAN. */
export function isValidated(raw = {}) {
  if (raw.is_validated != null) return truthy(raw.is_validated);
  if (raw.status != null && String(raw.status) === '1') return true;
  return Boolean(raw.cufe);
}

function toCustomerView(raw) {
  const customer = raw.customer ?? {};
  return {
    name:
      customer.graphic_representation_name ||
      customer.names ||
      customer.company ||
      raw.graphic_representation_name ||
      raw.names ||
      raw.company ||
      null,
    identification: customer.identification ?? raw.identification ?? null,
    email: customer.email ?? raw.email ?? null,
    municipality_code: codeOf(customer.municipality) ?? customer.municipality_code ?? null,
    // Codigos DIAN del adquiriente: la nota credito debe repetirlos (Factus v2
    // exige `customer` aunque la nota referencie la factura).
    names: customer.names ?? null,
    company: customer.company ?? null,
    dv: customer.dv ?? null,
    phone: customer.phone ?? null,
    identification_document_code:
      codeOf(customer.identification_document) ?? customer.identification_document_code ?? null,
    legal_organization_code: codeOf(customer.legal_organization) ?? customer.legal_organization_code ?? null,
    tribute_code: codeOf(customer.tribute) ?? customer.tribute_code ?? null,
    responsibilities: Array.isArray(customer.responsibilities)
      ? customer.responsibilities.map((item) => codeOf(item)).filter(Boolean)
      : null,
  };
}

function toItemView(item) {
  const tax = item.taxes?.[0] ?? {};
  return {
    code_reference: item.code_reference ?? null,
    name: item.name,
    quantity: toNumber(item.quantity) ?? 0,
    price: toNumber(item.price) ?? 0,
    discount_rate: toNumber(item.discount_rate) ?? 0,
    // El detalle de Factus anida la tarifa: taxes[0].rates[0].rate.
    tax_rate: toNumber(tax.rate ?? tax.rates?.[0]?.rate ?? item.tax_rate) ?? 0,
    tax_code: codeOf(tax.code ?? tax.tribute ?? item.tribute) ?? '01',
    is_excluded: truthy(tax.is_excluded ?? item.is_excluded),
    unit_measure_code: codeOf(item.unit_measure) ?? item.unit_measure_code ?? null,
    standard_code: codeOf(item.standard_code) ?? null,
  };
}

function toTotals(raw, items) {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.price * (1 - i.discount_rate / 100), 0);
  const tax = items.reduce((sum, i) => sum + i.quantity * i.price * (1 - i.discount_rate / 100) * (i.tax_rate / 100), 0);
  const totals = raw.totals ?? {};
  // Los listados no traen items: sin ellos no se inventa un subtotal de 0.
  const fromItems = (value) => (items.length ? round2(value) : null);
  return {
    subtotal: toNumber(totals.gross_amount ?? raw.gross_value) ?? fromItems(subtotal),
    tax: toNumber(totals.tax_amount ?? raw.tax_amount) ?? fromItems(tax),
    total: toNumber(totals.total ?? raw.total) ?? fromItems(subtotal + tax),
  };
}

// Factus real lista las notas de una factura sin su concepto ({ id, number }):
// sin concepto no se puede afirmar que sea una anulacion, asi que no cuenta.
function creditNoteNumbers(notes, { onlyCancellations }) {
  if (!Array.isArray(notes)) return [];
  return notes
    .filter((note) => !onlyCancellations || String(codeOf(note.correction_concept_code ?? note.correction_concept) ?? '') === '2')
    .map((note) => note.number)
    .filter(Boolean);
}

const codeOf = (value) => (value && typeof value === 'object' ? value.code ?? null : value ?? null);
const truthy = (value) => value === true || value === 1 || value === '1' || value === 'true';
const round2 = (value) => Math.round(value * 100) / 100;

function toNumber(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function httpsUrl(value) {
  return typeof value === 'string' && /^https:\/\//.test(value) ? value : null;
}
