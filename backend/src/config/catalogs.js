/**
 * Subconjunto de las tablas de codigos DIAN que necesita el agente para
 * construir facturas y notas credito sin tener que preguntarle todo al
 * usuario. No es el catalogo completo de Factus, solo los valores mas
 * comunes para una venta simple de bienes o servicios en Colombia.
 */

export const IDENTIFICATION_DOCUMENTS = {
  CEDULA_CIUDADANIA: '13',
  CEDULA_EXTRANJERIA: '22',
  NIT: '31',
  PASAPORTE: '41',
  TARJETA_IDENTIDAD: '12',
};

export const LEGAL_ORGANIZATION = {
  PERSONA_JURIDICA: '1',
  PERSONA_NATURAL: '2',
};

export const DEFAULT_TRIBUTE_CODE = 'ZZ';
export const DEFAULT_RESPONSIBILITY = ['R-99-PN'];

export const UNIT_MEASURE = {
  UNIDAD: '94',
};

export const STANDARD_CODE = {
  USO_INTERNO_VENDEDOR: '999',
};

export const TAX = {
  IVA_0: { code: '01', rate: '0.00' },
  IVA_5: { code: '01', rate: '5.00' },
  IVA_19: { code: '01', rate: '19.00' },
  EXCLUIDO: { code: '01', rate: '0.00', is_excluded: true },
};

export const PAYMENT_FORM = {
  CONTADO: '1',
  CREDITO: '2',
};

export const PAYMENT_METHOD = {
  EFECTIVO: '10',
  TARJETA_CREDITO: '48',
  TARJETA_DEBITO: '49',
  TRANSFERENCIA: '42',
};

// Tabla DIAN de conceptos de correccion para notas credito (Anexo tecnico 1.9).
export const CREDIT_NOTE_CORRECTION_CONCEPT = {
  DEVOLUCION_PARCIAL: '1',
  ANULACION: '2',
  DESCUENTO: '3',
  AJUSTE_PRECIO: '4',
  DESCUENTO_PRONTO_PAGO: '5',
  DESCUENTO_VOLUMEN: '6',
};

export const CREDIT_NOTE_CONCEPT_LABEL = {
  1: 'Devolución parcial',
  2: 'Anulación de factura',
  3: 'Rebaja o descuento',
  4: 'Ajuste de precio',
  5: 'Descuento por pronto pago',
  6: 'Descuento por volumen',
};

// customization_id 20 = nota credito que referencia una factura electronica.
export const CREDIT_NOTE_CUSTOMIZATION_WITH_BILL = '20';

// Limites que Factus Pay acepta para un recaudo (COP).
export const COLLECTION_AMOUNT_LIMITS = { min: 10000, max: 12000000 };

export const DEFAULT_MUNICIPALITY_CODE = '11001'; // Bogota D.C.
export const DEFAULT_COUNTRY_CODE = 'CO';
