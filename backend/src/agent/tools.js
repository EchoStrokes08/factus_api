import * as invoiceService from '../services/invoiceService.js';
import * as creditNoteService from '../services/creditNoteService.js';
import { CREDIT_NOTE_CORRECTION_CONCEPT } from '../config/catalogs.js';
import { resetDraft } from './sessionStore.js';
import { mapPaymentForm, mapPaymentMethod } from './paymentMapping.js';

/**
 * Puente entre el agente conversacional y la capa de negocio (services/).
 * Cada handler SOLO traduce argumentos del modelo -> llamadas a los
 * servicios y resume el resultado para el modelo. Ninguna regla de Factus
 * vive aqui.
 */

export const toolDefinitions = [
  {
    name: 'update_customer',
    description:
      'Guarda o actualiza los datos del cliente del documento en curso. Llamar cada vez que el usuario dé un dato nuevo del cliente.',
    input_schema: {
      type: 'object',
      properties: {
        identification: { type: 'string', description: 'Número de cédula o NIT, solo dígitos' },
        dv: { type: 'string', description: 'Dígito de verificación del NIT, si lo dicen' },
        identification_document_code: {
          type: 'string',
          description: 'Tipo de documento: 13 cédula, 31 NIT, 41 pasaporte, 22 cédula de extranjería',
        },
        names: { type: 'string', description: 'Nombre completo si es persona natural' },
        company: { type: 'string', description: 'Razón social si es empresa (persona jurídica)' },
        city: { type: 'string', description: 'Ciudad o municipio del cliente; se traduce a código DANE' },
        email: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string' },
      },
    },
  },
  {
    name: 'add_item',
    description: 'Agrega un producto o servicio al documento en curso.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre del producto o servicio' },
        quantity: { type: 'number', description: 'Cantidad, por defecto 1' },
        price: { type: 'number', description: 'Precio unitario en pesos colombianos, sin IVA' },
        tax_rate: { type: 'number', description: 'Porcentaje de IVA (0, 5 o 19). Si no se menciona, 19.' },
      },
      required: ['name', 'price'],
    },
  },
  {
    name: 'remove_item',
    description: 'Quita del borrador un producto que el usuario dijo por error (por nombre).',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
  },
  {
    name: 'set_payment_method',
    description: 'Define cómo paga el cliente.',
    input_schema: {
      type: 'object',
      properties: {
        form: { type: 'string', description: '"contado" o "credito"' },
        method: { type: 'string', description: 'efectivo, tarjeta_credito, tarjeta_debito o transferencia' },
      },
    },
  },
  {
    name: 'get_draft_summary',
    description: 'Devuelve el borrador actual (cliente, ítems, pago) para confirmarlo con el usuario antes de emitir.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'create_invoice',
    description:
      'Emite la factura electrónica ante la DIAN con el borrador (cliente + ítems + pago) y abre su cobro en Factus Pay. Usar solo después de que el usuario confirme el resumen.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'create_credit_note',
    description:
      'Emite una nota crédito PARCIAL (devolución, descuento o ajuste de precio) sobre una factura existente, con los ítems del borrador. Para anular una factura completa usa delete_invoice.',
    input_schema: {
      type: 'object',
      properties: {
        bill_number: { type: 'string', description: 'Número de la factura que se corrige (ej. SETP990001042)' },
        reason: { type: 'string', enum: ['devolucion', 'descuento', 'ajuste_precio'] },
      },
      required: ['bill_number', 'reason'],
    },
  },
  {
    name: 'delete_invoice',
    description:
      'Elimina o anula una factura por su número o código de referencia. Si la DIAN aún no la validó se elimina; si ya tiene CUFE, la ley exige anularla y se emite automáticamente una nota crédito de anulación (concepto 2). Confirma con el usuario antes de usarla.',
    input_schema: {
      type: 'object',
      properties: { reference_code: { type: 'string', description: 'Número de factura o código de referencia' } },
      required: ['reference_code'],
    },
  },
  {
    name: 'delete_credit_note',
    description: 'Elimina una nota crédito que la DIAN aún no ha validado, por su código de referencia.',
    input_schema: {
      type: 'object',
      properties: { reference_code: { type: 'string' } },
      required: ['reference_code'],
    },
  },
  {
    name: 'start_over',
    description: 'Borra el borrador actual para empezar un documento nuevo desde cero.',
    input_schema: { type: 'object', properties: {} },
  },
];

const PARTIAL_CONCEPTS = {
  devolucion: CREDIT_NOTE_CORRECTION_CONCEPT.DEVOLUCION_PARCIAL,
  descuento: CREDIT_NOTE_CORRECTION_CONCEPT.DESCUENTO,
  ajuste_precio: CREDIT_NOTE_CORRECTION_CONCEPT.AJUSTE_PRECIO,
};

const handlers = {
  update_customer(input, session) {
    Object.assign(session.draft.customer, withoutEmpty(input));
    return { ok: true, customer: session.draft.customer };
  },

  add_item(input, session) {
    session.draft.items.push({
      name: input.name,
      quantity: Number(input.quantity) > 0 ? Number(input.quantity) : 1,
      price: Number(input.price),
      tax_rate: input.tax_rate,
    });
    return { ok: true, items: session.draft.items };
  },

  remove_item(input, session) {
    const target = normalize(input.name);
    if (!target) return { ok: false, error: 'Indica el nombre del ítem a quitar' };
    const index = session.draft.items.findIndex((item) => normalize(item.name).includes(target));
    if (index === -1) return { ok: false, error: `No hay ningún ítem llamado "${input.name}" en el borrador` };
    const [removed] = session.draft.items.splice(index, 1);
    return { ok: true, removed: removed.name, items: session.draft.items };
  },

  set_payment_method(input, session) {
    session.draft.payment = {
      payment_form: mapPaymentForm(input.form),
      payment_method_code: mapPaymentMethod(input.method),
    };
    return { ok: true, payment: session.draft.payment };
  },

  get_draft_summary(input, session) {
    return { ok: true, draft: session.draft };
  },

  async create_invoice(input, session) {
    // La referencia se fija ANTES de llamar a Factus y vive en el borrador:
    // si la llamada se corta y se reintenta, Factus reconoce la referencia y
    // devuelve la misma factura en vez de emitir una duplicada.
    session.draft.reference_code ??= invoiceService.newInvoiceReference();
    const { invoice, collection } = await invoiceService.createInvoice(session.draft);
    session.createdDocument = { ...invoice, collection };
    resetDraft(session);
    return {
      ok: true,
      invoice: { number: invoice.number, total: invoice.totals.total, customer: invoice.customer.name, validated: invoice.is_validated },
      payment_collection: collection?.status ?? 'none',
    };
  },

  async create_credit_note(input, session) {
    const creditNote = await creditNoteService.createCreditNote({
      ...session.draft,
      bill_number: input.bill_number,
      correction_concept_code: PARTIAL_CONCEPTS[input.reason] ?? CREDIT_NOTE_CORRECTION_CONCEPT.DEVOLUCION_PARCIAL,
    });
    resetDraft(session);
    return { ok: true, credit_note: { number: creditNote.number, total: creditNote.totals.total, concept: creditNote.concept_label } };
  },

  async delete_invoice(input, session) {
    const result = await invoiceService.cancelInvoice(input.reference_code);
    session.createdDocument = result.invoice;
    return { ok: true, outcome: result.outcome, message: result.message, warning: result.warning };
  },

  async delete_credit_note(input) {
    const result = await creditNoteService.deleteCreditNote(input.reference_code);
    return { ok: true, message: result.message };
  },

  start_over(input, session) {
    resetDraft(session);
    return { ok: true };
  },
};

export async function runTool(name, input, session) {
  const handler = handlers[name];
  if (!handler) return { ok: false, error: `Herramienta desconocida: ${name}` };
  return handler(input ?? {}, session);
}

function withoutEmpty(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value != null && value !== ''));
}

function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}
