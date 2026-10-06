import { DANE_MUNICIPALITIES } from '../config/daneDivipola.js';
import {
  CREDIT_NOTE_CONCEPT_LABEL,
  IDENTIFICATION_DOCUMENTS,
  LEGAL_ORGANIZATION,
  PAYMENT_FORM,
  PAYMENT_METHOD,
  TAX,
} from '../config/catalogs.js';

export function getMunicipalities(req, res) {
  res.json({
    status: 'success',
    data: DANE_MUNICIPALITIES,
  });
}

export function getCatalogs(req, res) {
  res.json({
    status: 'success',
    data: {
      dane_municipalities: DANE_MUNICIPALITIES,
      identification_documents: IDENTIFICATION_DOCUMENTS,
      legal_organizations: LEGAL_ORGANIZATION,
      payment_forms: PAYMENT_FORM,
      payment_methods: PAYMENT_METHOD,
      taxes: TAX,
      credit_note_concepts: CREDIT_NOTE_CONCEPT_LABEL,
    },
  });
}
