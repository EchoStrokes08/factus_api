import * as invoiceService from '../services/invoiceService.js';

export async function create(req, res) {
  const result = await invoiceService.createInvoice(req.body);
  res.status(201).json({ status: 'success', data: result });
}

export async function remove(req, res) {
  const result = await invoiceService.deleteInvoice(req.params.referenceCode);
  res.json({ status: 'success', data: result });
}

export async function list(req, res) {
  const result = await invoiceService.listInvoices(req.query);
  res.json({ status: 'success', data: result });
}

export async function get(req, res) {
  const result = await invoiceService.getInvoice(req.params.referenceCode);
  res.json({ status: 'success', data: result });
}
