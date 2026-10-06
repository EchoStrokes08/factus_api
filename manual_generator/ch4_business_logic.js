import {
  createHeading1,
  createHeading2,
  createHeading3,
  createParagraph,
  createRichParagraph,
  createBullet,
  createCallout,
  createCodeBlock,
  createTable,
  pageBreak,
} from './helpers.js';

export function getChapter4() {
  return [
    pageBreak(),
    createHeading1('CAPÍTULO 4: LÓGICA DE NEGOCIO Y MAPEO DE DATOS'),
    
    createHeading2('4.1. Construcción del Documento Fiscal (documentBuilder.js)'),
    createParagraph('El módulo `backend/src/services/documentBuilder.js` es el motor de conversión tributaria. Toma el borrador simplificado del agente y lo enriquece con las especificaciones exactas del estándar UBL 2.1 de la DIAN.'),

    createHeading3('A. Construcción del Adquirente (buildCustomer)'),
    createParagraph('La DIAN clasifica a los compradores estrictamente en dos naturalezas jurídicas con reglas excluyentes:'),
    createBullet('Se asigna legal_organization_code: 2 y por defecto identification_document_code: 13 (Cédula). Requiere names y prohíbe company.', 'Persona Natural (names):'),
    createBullet('Se asigna legal_organization_code: 1 y identification_document_code: 31 (NIT). Exige company (razón social) y prohíbe names.', 'Persona Jurídica (company):'),
    createParagraph('Adicionalmente, se integra con `daneDivipola.js`: si el usuario dictó "en Cali", `resolveMunicipalityCode` busca en el catálogo fonético y asigna el código `76001`. Si la ciudad no se reconoce, el campo se omite de forma segura (la DIAN lo admite como opcional para ventas al consumidor final).'),

    createHeading3('B. Cálculo Matemático de Impuestos por Línea (computeTotal)'),
    createParagraph('Un error común en facturación consiste en sumar todos los productos y aplicar el 19% al subtotal global. La DIAN exige el cálculo y redondeo del IVA línea por línea:'),
    createCodeBlock(
`export function computeTotal(items) {
  const gross = items.reduce((sum, i) => sum + Number(i.price_amount) * Number(i.quantity), 0);
  const tax = items.reduce((sum, i) => {
    const rate = Number(i.tax_rates?.[0]?.tax_rate ?? 0);
    const lineTotal = Number(i.price_amount) * Number(i.quantity);
    return sum + (lineTotal * rate) / 100;
  }, 0);
  return round2(gross + tax);
}`, 'JavaScript (documentBuilder.js)'
    ),
    createParagraph('Al calcular el impuesto por cada ítem individual y redondearlo a 2 decimales (`round2`), se garantiza que el monto total de la factura coincida al centavo exacto con la suma de los valores fiscales en la DIAN y en el recaudo de Factus Pay.'),

    createHeading2('4.2. El Amortiguador de Variabilidad (factusMapper.js)'),
    createParagraph('Las APIs de Factus v2 son ricas en prestaciones, pero presentan pequeñas variaciones estructurales entre endpoints que podrían romper el frontend si no se neutralizan:'),
    createBullet('Unas veces el detalle viene en la raíz ({ data: { number: "SETP..." } }) y otras anidado ({ data: { bill: { number: "SETP..." } } }). unwrapDocument() normaliza ambos casos.', '1. Estructura Plana vs Anidada:'),
    createBullet('Los catálogos a veces devuelven strings primitivos ("10") y otras veces objetos ({ code: "10", name: "Efectivo" }). La función pura codeOf() extrae el código sin importar la forma.', '2. Códigos vs Objetos:'),
    createBullet('La paginación puede llegar como data.data o como data directo. unwrapPage() detecta la estructura y extrae los registros homogéneamente.', '3. Variaciones en Paginación:'),
    createBullet('En facturas, Factus anida las tasas de IVA de forma compleja: item.taxes[0].rates[0].rate. toItemView() inspecciona múltiples caminos para extraer la tarifa sin lanzar errores de "undefined".', '4. Anidamiento Profundo de Impuestos:'),

    createCodeBlock(
`function toItemView(item) {
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
}`, 'JavaScript (factusMapper.js)'
    ),

    createHeading2('4.3. Ciclo de Vida y Gestión de Facturas (invoiceService.js)'),
    createParagraph('El archivo `invoiceService.js` coordina todo el ciclo de vida de una factura electrónica:'),
    
    createHeading3('El Truco de Indexación en Sandbox Compartido (listOwnInvoices)'),
    createParagraph('La cuenta de sandbox público de Factus es compartida entre decenas de empresas y desarrolladores. Si hiciéramos un `GET /v2/bills` genérico, veríamos miles de facturas ajenas. Factus Voz resuelve esto con un patrón ingenioso:'),
    createCallout(
      'INDEXACIÓN CRUZADA CON FACTUS PAY',
      'Mientras que la cuenta de Factus Sandbox es compartida, la cuenta de Factus Pay es privada y propia del usuario. Como cada factura emitida por nuestra app abre un recaudo en Factus Pay con el mismo reference_code exacto, el servicio consulta la lista privada de recaudos de Factus Pay y luego trae de Factus únicamente las facturas coincidentes. Así, el panel solo muestra las facturas del usuario de forma 100% limpia.',
      'IMPORTANT'
    ),

    createHeading3('El Flujo de Cancelación Legal (cancelInvoice)'),
    createParagraph('Cuando se solicita cancelar una factura, el servicio ejecuta la siguiente lógica estricta:'),
    createBullet('1. Consulta la factura con getInvoice(identifier).', 'Paso 1:'),
    createBullet('2. Verifica si ya fue anulada previamente buscando la nota ANUL-... Si ya está anulada, retorna outcome: "already_voided" sin duplicar nada.', 'Paso 2:'),
    createBullet('3. Si la factura NO está validada (sin CUFE), llama a tryDestroy() para borrarla limpiamente.', 'Paso 3:'),
    createBullet('4. Si la factura SÍ está validada ante la DIAN, llama inmediatamente a createCancellationNote() de creditNoteService para generar la Nota Crédito Concepto 2.', 'Paso 4:'),
    createBullet('5. Si el recaudo de Factus Pay ya fue pagado por el cliente, añade un aviso (warning) advirtiendo al comerciante que debe reembolsar el dinero manualmente.', 'Paso 5:'),

    createHeading2('4.4. Notas Crédito Parciales y de Anulación (creditNoteService.js)'),
    createParagraph('El servicio distingue dos operaciones esenciales:'),
    createBullet('El usuario dicta qué producto se devuelve o qué descuento aplica. El servicio valida estrictamente que el monto de la nota no exceda el total de la factura original.', 'Notas Parciales (Conceptos 1, 3 y 4):'),
    createBullet('Recrea la factura completa línea por línea bajo el Concepto 2. En el payload se asigna customization_id: 20 (código oficial DIAN para notas crédito con factura electrónica referenciada).', 'Nota de Anulación Total (Concepto 2):'),

    createHeading2('4.5. Selección Inteligente de Rangos DIAN (numberingRangeService.js)'),
    createParagraph('Factus exige enviar `numbering_range_id`. Si una cuenta tiene varios rangos, la selección no puede dejarse al azar. El algoritmo de selección:'),
    createBullet('Descarta rangos eliminados (deleted_at), inactivos (is_active !== 1) o vencidos por fecha (end_date pasada).', '1. Filtro de Vigencia:'),
    createBullet('Calcula los folios libres con remaining = to - current + 1. Si remaining <= 0, el rango se descarta como agotado.', '2. Verificación de Folios:'),
    createBullet('Clasifica mediante expresiones regulares los rangos de facturas (código 21) y los de notas crédito (código 22).', '3. Clasificación Semántica:'),
    createBullet('Si existen múltiples rangos activos válidos, elige automáticamente el que tenga la fecha de vencimiento más lejana.', '4. Selección Óptima:'),
    createBullet('Almacena la elección en memoria durante 5 minutos (CACHE_TTL_MS). Si Factus devuelve un error 4xx al emitir (lo que indicaría un cambio en el panel de Factus), la caché se invalida inmediatamente con invalidateRangeCache().', '5. Caché Reactiva:'),
  ];
}
