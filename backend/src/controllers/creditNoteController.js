import * as creditNoteService from '../services/creditNoteService.js';
import { toFactusFilters } from './queryFilters.js';

export async function create(req, res) {
  const result = await creditNoteService.createCreditNote(req.body ?? {});
  res.status(201).json({ status: 'success', data: result });
}

export async function remove(req, res) {
  const result = await creditNoteService.deleteCreditNote(req.params.referenceCode);
  res.json({ status: 'success', data: result });
}

/** ?numbers=CRTE765,CRTE766 trae solo esas notas; sin el, el listado de Factus. */
export async function list(req, res) {
  const result = req.query.numbers
    ? await creditNoteService.listCreditNotesByNumbers(String(req.query.numbers).split(','))
    : await creditNoteService.listCreditNotes(toFactusFilters(req.query));
  res.json({ status: 'success', data: result });
}
