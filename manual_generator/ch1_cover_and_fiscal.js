import {
  createTitle,
  createSubtitle,
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

export function getChapter1() {
  return [
    createTitle('MANUAL MAESTRO DE ARQUITECTURA, CÓDIGO Y DOMINIO FISCAL'),
    createSubtitle('Guía Integral de Estudio Profundo del Proyecto Factus Voz\n(Análisis Exhaustivo Línea por Línea, Patrones de Diseño e Integración DIAN)'),

    createTable(
      ['Metadato del Documento', 'Especificación Técnica del Sistema'],
      [
        ['Nombre del Proyecto', 'Factus Voz (Facturación Electrónica por Voz e Inteligencia Artificial)'],
        ['Entorno de Ejecución', 'Node.js 18+ / 24+ (ES Modules nativos) + React 18 (Vite)'],
        ['Integraciones Oficiales', 'Factus API v2 (DIAN Colombia) + Factus Pay API v1'],
        ['Modelo de Lenguaje', 'Claude 3.5 / 4.5 Sonnet (Tool Use) + Fallback Determinista en Memoria'],
        ['Estándares Fiscales', 'Resolución 000042 / Decreto 358 de 2020 DIAN (CUFE, UBL 2.1, DANE DIVIPOLA)'],
        ['Diseño Visual', 'Security Paper & Intaglio Banknote System (CSS Vanilla, Rosetas Guilloche)'],
        ['Propósito de la Guía', 'Manual definitivo para comprender cada archivo, función y decisión del código'],
      ]
    ),

    createParagraph('', { spacingAfter: 200 }),
    createCallout(
      'ALCANCE DE ESTE MANUAL',
      'Este documento ha sido redactado con el propósito explícito de que un desarrollador o arquitecto de software comprenda con absoluta precisión cada línea de código, el flujo completo de datos entre el navegador y la DIAN, las justificaciones tributarias de cada cálculo matemático y las razones por las cuales se adoptaron patrones de diseño avanzados como el "Single-Flight Promise", la "Idempotencia Determinística" y el "Mapeo Defensivo Puro".',
      'IMPORTANT'
    ),

    pageBreak(),

    createHeading1('TABLA DE CONTENIDOS Y ESTRUCTURA SISTEMÁTICA'),
    createParagraph('El manual se organiza en 7 grandes capítulos que recorren el sistema desde la ley fiscal hasta la última línea de CSS reactivo:'),
    createBullet('Marco regulatorio colombiano, el problema del formulario de 20 campos, anatomía de CUFE y UBL 2.1, reglas de anulación (Concepto 2) y recaudos Factus Pay.', 'Capítulo 1: Fundamentos y Dominio Fiscal Colombiano:'),
    createBullet('Flujo bidireccional de datos, capas de software (Routes -> Controllers -> Services -> API), estrategia de idempotencia con reference_code y tolerancia a fallos.', 'Capítulo 2: Arquitectura Global del Sistema:'),
    createBullet('Análisis de httpClientFactory.js, tokenManager.js (single-flight, refresh proactivo, retry ante 401), ApiError.js y el simulador mock local.', 'Capítulo 3: Capa de Red y Autenticación Backend:'),
    createBullet('Desglose de documentBuilder.js, factusMapper.js (funciones puras y amortiguador), invoiceService.js, creditNoteService.js y numberingRangeService.js.', 'Capítulo 4: Lógica de Negocio y Mapeo de Datos:'),
    createBullet('agentService.js (Claude tool use y prompt engineering para voz), tools.js, fallbackAgent.js (máquina de estados), textParsing.js (regex y fonética) y sessionStore.js.', 'Capítulo 5: El Cerebro Conversacional y la Inteligencia Artificial:'),
    createBullet('useSpeechRecognition.js (Web Speech API continua), useSpeechSynthesis.js (es-CO), CallScreen.jsx, InvoiceViewer.jsx (diseño de billete) y theme.css.', 'Capítulo 6: Frontend React e Interfaz de Voz:'),
    createBullet('Matriz de 12 casos límite analizados en código, guía para agregar nuevos tributos (Impoconsumo, Retenciones) y hoja de ruta de estudio.', 'Capítulo 7: Casos de Borde, Extensión del Sistema y Guía de Estudio:'),

    pageBreak(),

    createHeading1('CAPÍTULO 1: FUNDAMENTOS Y DOMINIO FISCAL COLOMBIANO'),
    
    createHeading2('1.1. La Problemática de la Facturación Electrónica en Colombia'),
    createParagraph('En Colombia, la Dirección de Impuestos y Aduanas Nacionales (DIAN), mediante el Decreto 358 de 2020 y la Resolución 000042 de 2020, exige que toda operación de venta de bienes y servicios sea soportada a través de una Factura Electrónica de Venta validada previamente en sus servidores mediante el estándar UBL 2.1.'),
    createParagraph('Para emitir una factura legalmente válida, los sistemas tradicionales obligan al cajero, comerciante o profesional independiente a diligenciar un formulario con más de 20 campos técnicos obligatorios. Entre ellos se destacan:'),
    createBullet('13 para Cédula de Ciudadanía, 31 para NIT, 22 para Cédula de Extranjería, 41 para Pasaporte.', 'Tipo de documento de identidad:'),
    createBullet('Persona Natural (código 2) o Persona Jurídica (código 1). Si es empresa, exige obligatoriamente razón social y dígito de verificación (DV).', 'Organización Jurídica:'),
    createBullet('Código numérico oficial de 5 dígitos de la División Político-Administrativa de Colombia (ej. Bogotá es 11001, Medellín es 05001, Cali es 76001). Un error en este código provoca el rechazo inmediato de la DIAN.', 'Código DANE del Municipio:'),
    createBullet('Régimen ordinario, no responsable de IVA, gran contribuyente (código R-99-PN por defecto en pequeños comercios).', 'Responsabilidades Tributarias:'),
    createBullet('Código 01 para IVA, con tarifas de 0%, 5% o 19%, o clasificación como excluido.', 'Tributos e Impuestos por Línea:'),
    createBullet('Código 10 (Efectivo), 42 (Transferencia bancaria), 48 (Tarjeta de Crédito), 49 (Tarjeta Débito), además de la forma de pago (1: Contado, 2: Crédito a 30 días).', 'Medio de Pago DIAN:'),
    createBullet('Resolución oficial emitida por la DIAN, que asigna un prefijo (ej. SETP), un rango numérico (desde 990000000 hasta 995000000) y una fecha de vigencia estricta.', 'Rango de Numeración:'),

    createCallout(
      'EL VALOR DISRUPTIVO DE FACTUS VOZ',
      'Factus Voz reemplaza la fricción de este formulario exhaustivo mediante una interfaz conversacional por voz. El comerciante solo menciona en lenguaje natural quién es el cliente, qué le vendió y cómo le pagaron. La aplicación se encarga de inferir, mapear, codificar y enviar el documento perfecto a Factus API v2 sin que el usuario tenga que memorizar catálogos ni codificaciones tributarias.',
      'NOTE'
    ),

    createHeading2('1.2. Anatomía del CUFE y la Validación Previa'),
    createParagraph('El CUFE (Código Único de Facturación Electrónica) es una cadena criptográfica SHA-384 que identifica de forma unívoca cada factura en el territorio nacional. Se calcula combinando:'),
    createBullet('Número de la factura con su prefijo oficial.', '1.'),
    createBullet('Fecha y hora exacta de emisión.', '2.'),
    createBullet('Valor bruto, valor del IVA y total a pagar.', '3.'),
    createBullet('NIT del emisor y número de identificación del adquirente.', '4.'),
    createBullet('Clave técnica asignada por la DIAN en la resolución de facturación.', '5.'),
    createParagraph('Cuando Factus recibe el documento a través del endpoint POST /v2/bills/validate, realiza la validación técnica en milisegundos, firma el XML UBL 2.1 con su certificado digital y lo transmite a la DIAN. La DIAN emite el mensaje de aceptación ("Documento validado por la DIAN") y asigna el CUFE definitivo. A partir de ese milisegundo exacto, el documento adquiere plena validez jurídica y contable.'),

    createHeading2('1.3. La Regla Legal Suprema: Eliminar vs. Anular'),
    createParagraph('Uno de los errores más graves en los sistemas contables novatos es pretender "eliminar" una factura que ya fue emitida. La legislación tributaria colombiana prohíbe taxativamente la eliminación de una factura validada por la DIAN.'),
    
    createTable(
      ['Estado Fiscal del Documento', 'Acción Técnica Permitida', 'Comportamiento en Factus Voz'],
      [
        ['Factura NO Validada (Sin CUFE)', 'Destrucción directa en servidor (DELETE)', 'Ejecuta DELETE /v2/bills/destroy/reference/:ref y libera los datos.'],
        ['Factura Validada (Con CUFE DIAN)', 'PROHIBIDO ELIMINAR. Exige Nota Crédito Concepto 2.', 'Emite automáticamente POST /v2/credit-notes/validate replicando la factura.'],
      ]
    ),

    createParagraph('', { spacingAfter: 140 }),
    createCallout(
      'DECRETO 358 DE 2020: CONCEPTO DE CORRECCIÓN 2',
      'Una factura validada ya afectó la contabilidad fiscal del emisor y del receptor ante la DIAN. Para reversarla, la DIAN exige emitir una Nota Crédito electrónica con concepto de corrección 2 ("Anulación de factura electrónica"). Dicha nota crédito debe reflejar exactamente los mismos ítems, cantidades, valores unitarios, tarifas de impuestos y monto total que la factura original, dejando el saldo neto en cero de forma transparente para los auditores tributarios.',
      'FISCAL'
    ),

    createHeading2('1.4. Factus Pay: Cobro Electrónico y Recaudos No Bloqueantes'),
    createParagraph('Factus Pay es la plataforma de recaudos y pagos electrónicos asociada a Factus. Permite que una factura recién emitida genere una pasarela de pago y un código QR dinámico para que el comprador pague desde su billetera digital (Bancolombia, Nequi, Daviplata, PSE, etc.).'),
    createParagraph('El sistema implementa dos principios esenciales de ingeniería para Factus Pay:'),
    createBullet('La factura es un documento legal prioritario; si Factus Pay experimenta lentitud, caída de servicio o si el monto está fuera del rango permitido ($10.000 a $12.000.000 COP), la factura NO se cancela ni se rechaza. El backend registra la factura como exitosa y etiqueta el cobro como skipped, disabled o error, informándolo en la interfaz.', '1. Filosofía No Bloqueante:'),
    createBullet('Factus Pay genera el código QR mediante un proceso en segundo plano. El recaudo nace con estado started, transiciona a ready (cuando el QR está renderizado) y finalmente a paid cuando el comprador transfiere. El visor del frontend consulta cada 3 segundos el estado del recaudo hasta pintar el QR.', '2. Ciclo de Vida Asíncrono:'),
  ];
}
