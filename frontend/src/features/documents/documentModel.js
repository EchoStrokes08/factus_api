/**
 * Modelo de presentacion de los documentos. El backend ya entrega vistas
 * normalizadas (invoice/credit-note views); aqui solo se derivan los datos
 * que la interfaz necesita leer de un vistazo: estado fiscal, totales por
 * linea y textos. Ningun componente deberia interpretar la vista cruda.
 */

export const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export const formatMoney = (value) => (Number.isFinite(value) ? money.format(value) : '—');

export function normalizeInvoice(raw = {}) {
  const items = (raw.items || []).map((item) => {
    const quantity = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    const discount = Number(item.discount_rate) || 0;
    return {
      name: item.name,
      quantity,
      price,
      taxRate: Number(item.tax_rate) || 0,
      isExcluded: Boolean(item.is_excluded),
      subtotal: quantity * price * (1 - discount / 100),
    };
  });

  const voidedBy = raw.voided_by ?? [];
  return {
    identifier: raw.number || raw.reference_code,
    number: raw.number,
    referenceCode: raw.reference_code,
    cufe: raw.cufe,
    isValidated: Boolean(raw.is_validated),
    isSimulated: Boolean(raw.simulated),
    voidedBy,
    isVoided: voidedBy.length > 0,
    createdAt: raw.created_at ? new Date(raw.created_at) : null,
    customerName: raw.customer?.name || 'Cliente',
    customerId: raw.customer?.identification,
    municipalityCode: raw.customer?.municipality_code,
    items,
    hasDetail: items.length > 0,
    subtotal: toNumber(raw.totals?.subtotal),
    tax: toNumber(raw.totals?.tax),
    total: toNumber(raw.totals?.total),
    publicUrl: raw.public_url ?? null,
    resolution: raw.numbering_range?.resolution_number ?? null,
    collection: raw.collection ?? null,
  };
}

export function normalizeCreditNote(raw = {}) {
  return {
    identifier: raw.reference_code,
    number: raw.number,
    referenceCode: raw.reference_code,
    billNumber: raw.bill_number,
    cufe: raw.cufe,
    isValidated: Boolean(raw.is_validated),
    isSimulated: Boolean(raw.simulated),
    isCancellation: String(raw.concept_code) === '2',
    conceptLabel: raw.concept_label,
    customerName: raw.customer?.name,
    total: toNumber(raw.totals?.total),
  };
}

/** Estados de un recaudo en Factus Pay, con el tono de etiqueta que les corresponde. */
export const COLLECTION_STATUS = {
  started: { label: 'Iniciado', tone: 'draft' },
  ready: { label: 'Listo para pagar', tone: 'mock' },
  paid: { label: 'Pagado', tone: 'valid' },
  failed: { label: 'Fallido', tone: 'voided' },
  rejected: { label: 'Rechazado', tone: 'voided' },
};

export function normalizeCollection(raw = {}) {
  const status = COLLECTION_STATUS[raw.status] ?? { label: raw.status || 'Desconocido', tone: 'draft' };
  return {
    referenceCode: raw.reference_code,
    amount: toNumber(raw.amount),
    status: raw.status,
    statusLabel: status.label,
    tone: status.tone,
    createdAt: raw.created_at ? new Date(raw.created_at) : null,
    qr: raw.qr ?? null,
  };
}

/**
 * Factus no siempre adjunta las notas credito al listado de facturas: se
 * cruzan con el listado de notas (concepto 2 = anulacion) para que una
 * factura anulada se vea anulada aunque el detalle no lo diga.
 */
export function markVoidedInvoices(invoices, creditNotes) {
  const byBill = new Map();
  const cancellationNumbers = new Set();
  for (const note of creditNotes) {
    if (String(note.concept_code) !== '2') continue;
    cancellationNumbers.add(note.number);
    if (note.bill_number) byBill.set(note.bill_number, note.number);
  }
  return invoices.map((invoice) => {
    if (invoice.voided_by?.length) return invoice;
    // Factus real lista las notas de la factura sin concepto: se cruzan por numero.
    const voidedBy = byBill.get(invoice.number) ?? invoice.credit_note_numbers?.find((n) => cancellationNumbers.has(n));
    return voidedBy ? { ...invoice, voided_by: [voidedBy] } : invoice;
  });
}

function toNumber(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
