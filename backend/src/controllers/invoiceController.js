import * as invoiceService from '../services/invoiceService.js';
import { toFactusFilters } from './queryFilters.js';

export async function create(req, res) {
  const result = await invoiceService.createInvoice(req.body ?? {});
  res.status(201).json({ status: 'success', data: result });
}

/** Elimina la factura si no esta validada; si lo esta, la anula con nota credito. */
export async function cancel(req, res) {
  const result = await invoiceService.cancelInvoice(req.params.identifier);
  res.json({ status: 'success', data: result });
}

export async function list(req, res) {
  const result = await invoiceService.listInvoices(toFactusFilters(req.query));
  res.json({ status: 'success', data: result });
}

export async function get(req, res) {
  const result = await invoiceService.getInvoice(req.params.identifier);
  res.json({ status: 'success', data: result });
}

export async function collection(req, res) {
  const result = await invoiceService.getCollection(req.params.identifier);
  res.json({ status: 'success', data: result });
}

export async function pdf(req, res) {
  const { fileName, content } = await invoiceService.getInvoicePdf(req.params.identifier);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${fileName.replace(/"/g, '')}"`);
  res.send(content);
}

