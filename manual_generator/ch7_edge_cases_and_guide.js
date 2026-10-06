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

export function getChapter7() {
  return [
    pageBreak(),
    createHeading1('CAPÍTULO 7: CASOS DE BORDE, EXTENSIÓN DEL SISTEMA Y HOJA DE RUTA'),
    
    createHeading2('7.1. Matriz de Casos de Borde (Edge Cases) y Blindaje en Código'),
    createParagraph('El código de Factus Voz fue construido con una mentalidad defensiva. A continuación se detalla la matriz de los 12 casos límite más desafiantes y cómo están blindados:'),

    createTable(
      ['Escenario Límite / Caso de Borde', 'Riesgo Técnico / Fiscal', 'Solución Blindada en el Código'],
      [
        ['1. Corte de red durante emisión de factura', 'Doble emisión y cobro duplicado ante la DIAN.', 'El reference_code se fija en el borrador antes de llamar a Factus; al reintentar, Factus devuelve la misma factura.'],
        ['2. Revocación externa del Token OAuth2', 'Error 401 que rompe la experiencia de usuario.', 'withFactusToken atrapa el 401, purga el token de la memoria y reintenta la petición una vez con un token nuevo.'],
        ['3. Usuario pide anular dos veces la misma factura', 'Doble nota crédito que descuadra la contabilidad.', 'La referencia determinística ANUL-<ref> hace que Factus reconozca la nota existente y devuelva outcome: already_voided.'],
        ['4. Intento de "eliminar" factura con CUFE', 'Violación del Decreto 358 de 2020 DIAN.', 'cancelInvoice detecta que ya está validada y conmuta automáticamente a emitir una Nota Crédito Concepto 2.'],
        ['5. Intento de eliminar una Nota Crédito validada', 'Sanción fiscal por borrado de documento soporte.', 'deleteCreditNote verifica is_validated y arroja HTTP 409 explicando la prohibición legal al usuario.'],
        ['6. Nota crédito parcial supera total de factura', 'Saldo contable negativo ante la DIAN.', 'createCreditNote compara montos antes de llamar a Factus y arroja un error amigable si el valor es excesivo.'],
        ['7. Anulación de factura con cobro ya pagado', 'Pérdida de dinero del comprador.', 'cancelInvoice inspecciona Factus Pay y añade un aviso (warning) explícito para que el comercio devuelva el dinero.'],
        ['8. Caída o lentitud extrema en Factus Pay', 'Bloqueo innecesario de la emisión de la factura.', 'Filosofía no bloqueante: la factura se valida y el recaudo se etiqueta como error/disabled sin abortar.'],
        ['9. Ciudad dictada no existe en el catálogo DANE', 'Rechazo de validación DIAN por DIVIPOLA erróneo.', 'resolveMunicipalityCode omite el campo si no hay coincidencia exacta o fonética; la DIAN lo admite en ventas retail.'],
        ['10. Anthropic API Key inválida o sin créditos', 'Llamada telefónica abortada con error 500.', 'claudeRejectedKey conmuta de inmediato en el mismo turno al asistente guiado determinista (fallbackAgent).'],
        ['11. Peticiones paralelas cuando expira el token', 'Tormenta de peticiones de login a Factus.', 'Patrón Single-Flight Promise (factusTokenInFlight) que unifica concurrentemente todas las llamadas.'],
        ['12. Rango DIAN agotado durante el día', 'Facturas rechazadas consecutivamente.', 'Al recibir un 4xx de Factus, invalidateRangeCache() fuerza a reconsultar rangos frescos en la siguiente factura.'],
      ]
    ),

    createParagraph('', { spacingAfter: 140 }),
    createHeading2('7.2. Guía Paso a Paso para Extender el Sistema'),

    createHeading3('A. Cómo Agregar un Nuevo Tributo (ej. Impoconsumo o Retenciones)'),
    createParagraph('Si su comercio vende alimentos preparados (gravados con Impuesto Nacional al Consumo del 8% en lugar de IVA 19%):'),
    createBullet('1. En config/catalogs.js, registre el código oficial DIAN del tributo (ej. TRIBUTE_CODE: { IVA: "01", INC: "04" }).', 'Paso 1:'),
    createBullet('2. En documentBuilder.js, agregue al esquema de items el tributo correspondiente: tax_code: "04" y tax_rate: 8.', 'Paso 2:'),
    createBullet('3. En tools.js, actualice la herramienta add_item para permitir el parámetro opcional tax_type: "iva" | "inc".', 'Paso 3:'),

    createHeading3('B. Cómo Incorporar Notas Débito Electrónicas'),
    createParagraph('Para notas de aumento de valor o cobro de intereses:'),
    createBullet('1. Cree el cliente de red api/factusDebitNotesClient.js apuntando a POST /v2/debit-notes/validate.', 'Paso 1:'),
    createBullet('2. Cree el servicio services/debitNoteService.js replicando el esquema de creditNoteService.js con los códigos DIAN de concepto débito (1: Intereses, 2: Gastos por cobrar, 3: Cambio de valor).', 'Paso 2:'),
    createBullet('3. Añada la herramienta create_debit_note en tools.js y su respectiva pestaña en el HistoryPanel.jsx del frontend.', 'Paso 3:'),

    createHeading2('7.3. Hoja de Ruta de Estudio y Dominio del Proyecto'),
    createParagraph('Para dominar este código hasta el nivel de poder exponerlo en una sustentación técnica o modificarlo con solvencia:'),
    createBullet('Lea el Capítulo 1 y 2 de este manual. Comprenda la diferencia entre CUFE y UBL, y por qué una factura con CUFE no se destruye.', 'Día 1 (Dominio y Fundamentos):'),
    createBullet('Abra httpClientFactory.js, tokenManager.js y factusSandbox.js. Analice cómo funciona el operador ??= y el reintento ante 401.', 'Día 2 (Red y Autenticación):'),
    createBullet('Estudie documentBuilder.js y factusMapper.js. Comprenda por qué se redondea por ítem y cómo se absorben variaciones de Factus.', 'Día 3 (Lógica de Negocio):'),
    createBullet('Examine invoiceService.js y creditNoteService.js. Analice la regla cancelInvoice() y la referencia ANUL-.', 'Día 4 (Servicios Transaccionales):'),
    createBullet('Estudie agentService.js, tools.js, fallbackAgent.js y textParsing.js. Vea cómo el System Prompt moldea a Claude para hablar por teléfono.', 'Día 5 (Inteligencia Artificial):'),
    createBullet('Revise useSpeechRecognition.js, CallScreen.jsx y InvoiceViewer.jsx. Entienda la sincronización entre el micrófono y el sintetizador.', 'Día 6 y 7 (Frontend y Voz):'),

    createCallout(
      'CONCLUSIÓN DEL MANUAL',
      'Factus Voz demuestra que la combinación de Inteligencia Artificial Conversacional con una arquitectura de software limpia y un dominio tributario riguroso puede transformar una tarea tediosa y propensa a errores en una experiencia humana, rápida y agradable. Este código está listo para ser estudiado, desplegado y evolucionado.',
      'NOTE'
    ),
  ];
}
