import * as invoiceService from '../services/invoiceService.js';
import * as creditNoteService from '../services/creditNoteService.js';
import { resetDraft } from './sessionStore.js';
import { mapPaymentForm, mapPaymentMethod } from './paymentMapping.js';

/**
 * Puente entre el agente conversacional y la capa de negocio (services/).
 * Cada tool handler SOLO traduce argumentos del modelo -> llamadas a
 * invoiceService/creditNoteService. Ninguna logica de Factus vive aqui.
 */

export const toolDefinitions = [
  {
    name: 'update_customer',
    description:
      'Guarda o actualiza los datos del cliente para la factura o nota credito en curso. Llamar cada vez que el usuario de un dato nuevo del cliente.',
    input_schema: {
      type: 'object',
      properties: {
        identification: { type: 'string', description: 'Numero de cedula o NIT del cliente' },
        identification_document_code: {
          type: 'string',
          description: 'Codigo del tipo de documento: 13 cedula, 31 NIT, 41 pasaporte, 22 cedula extranjera',
        },
        names: { type: 'string', description: 'Nombre completo si es persona natural' },
        company: { type: 'string', description: 'Razon social si es persona juridica / empresa' },
        email: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string' },
      },
    },
  },
  {
    name: 'add_item',
    description: 'Agrega un producto o servicio a la factura/nota credito en curso.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre del producto o servicio' },
        quantity: { type: 'number', description: 'Cantidad, por defecto 1' },
        price: { type: 'number', description: 'Precio unitario en pesos colombianos, sin impuestos' },
        tax_rate: { type: 'number', description: 'Porcentaje de IVA (0, 5 o 19). Si no se menciona, usar 19.' },
      },
      required: ['name', 'price'],
    },
  },
  {
    name: 'set_payment_method',
    description: 'Define como paga el cliente.',
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
    description: 'Devuelve el estado actual del borrador (cliente, items, pago) para confirmarlo con el usuario antes de crear el documento.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'create_invoice',
    description:
      'Crea y valida la factura electronica con los datos acumulados (cliente + items + pago) y genera el recaudo de cobro en Factus Pay. Usar solo despues de confirmar los datos con el usuario.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'create_credit_note',
    description:
      'Crea una nota credito referenciando una factura ya existente, usando los items/cliente acumulados en el borrador.',
    input_schema: {
      type: 'object',
      properties: {
        bill_number: { type: 'string', description: 'Numero de la factura que se va a corregir/anular' },
        reason: {
          type: 'string',
          description: 'Motivo: "devolucion", "anulacion", "descuento" u "otros"',
        },
      },
      required: ['bill_number'],
    },
  },
  {
    name: 'delete_invoice',
    description: 'Elimina (solo si no ha sido validada por la DIAN) una factura por su codigo de referencia.',
    input_schema: {
      type: 'object',
      properties: { reference_code: { type: 'string' } },
      required: ['reference_code'],
    },
  },
  {
    name: 'delete_credit_note',
    description: 'Elimina (solo si no ha sido validada por la DIAN) una nota credito por su codigo de referencia.',
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

const REASON_CODES = { devolucion: '1', anulacion: '2', descuento: '3', otros: '6' };

export async function runTool(name, input, session) {
  switch (name) {
    case 'update_customer':
      Object.assign(session.draft.customer, input);
      return { ok: true, customer: session.draft.customer };

    case 'add_item':
      session.draft.items.push({
        name: input.name,
        quantity: input.quantity ?? 1,
        price: input.price,
        tax_rate: input.tax_rate,
      });
      return { ok: true, items: session.draft.items };

    case 'set_payment_method':
      session.draft.payment = {
        payment_form: mapPaymentForm(input.form),
        payment_method_code: mapPaymentMethod(input.method),
      };
      return { ok: true, payment: session.draft.payment };

    case 'get_draft_summary':
      return { ok: true, draft: session.draft };

    case 'create_invoice': {
      const result = await invoiceService.createInvoice(session.draft);
      session.history.push({ type: 'invoice', result });
      resetDraft(session);
      return { ok: true, result };
    }

    case 'create_credit_note': {
      const result = await creditNoteService.createCreditNote({
        ...session.draft,
        bill_number: input.bill_number,
        correction_concept_code: REASON_CODES[input.reason] || REASON_CODES.otros,
      });
      session.history.push({ type: 'creditNote', result });
      resetDraft(session);
      return { ok: true, result };
    }

    case 'delete_invoice':
      return { ok: true, result: await invoiceService.deleteInvoice(input.reference_code) };

    case 'delete_credit_note':
      return { ok: true, result: await creditNoteService.deleteCreditNote(input.reference_code) };

    case 'start_over':
      resetDraft(session);
      return { ok: true };

    default:
      return { ok: false, error: `Herramienta desconocida: ${name}` };
  }
}
