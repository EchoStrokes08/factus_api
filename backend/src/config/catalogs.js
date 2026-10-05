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

export const CREDIT_NOTE_CORRECTION_CONCEPT = {
  DEVOLUCION_PARCIAL: '1',
  ANULACION: '2',
  DESCUENTO: '3',
  OTROS: '6',
};

export const DEFAULT_MUNICIPALITY_CODE = '11001'; // Bogota D.C.
export const DEFAULT_COUNTRY_CODE = 'CO';
