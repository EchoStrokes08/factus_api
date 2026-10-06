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

export function getChapter5() {
  return [
    pageBreak(),
    createHeading1('CAPÍTULO 5: EL CEREBRO CONVERSACIONAL Y LA INTELIGENCIA ARTIFICIAL'),
    
    createHeading2('5.1. Orquestación con Claude y Prompt Engineering para Voz (agentService.js)'),
    createParagraph('El archivo `backend/src/agent/agentService.js` orquesta la conversación cuando existe una clave de Anthropic válida (`ANTHROPIC_API_KEY`). No se trata de un chatbot de texto convencional; su comportamiento está calibrado específicamente para la síntesis de voz en tiempo real:'),

    createHeading3('A. Reglas del System Prompt para Llamadas Telefónicas'),
    createParagraph('El prompt instruye a Claude con restricciones estrictas de locución:'),
    createBullet('Sus respuestas deben tener máximo 1 o 2 oraciones, usando vocabulario natural colombiano ("con gusto", "claro que sí"). Frases largas saturan la memoria del oyente.', 'Brevedad Extrema:'),
    createBullet('Nunca debe pedir cédula, ciudad, productos y medio de pago al mismo tiempo. Debe solicitar los datos de uno en uno para emular una llamada telefónica humana.', 'Preguntas Unitarias:'),
    createBullet('El agente no espera a tener todos los datos para llamar herramientas; apenas el usuario dice "se llama Pedro", invoca inmediatamente update_customer({ names: "Pedro" }).', 'Invocación Temprana de Herramientas:'),
    createBullet('Nunca lee URLs, hipervínculos ni cadenas crudas de CUFE; simplemente dice "Factura emitida con éxito por valor de $416.500".', 'Omisión de Ruido Visual:'),

    createHeading3('B. Bucle de Herramientas y Reenvío de Errores con is_error'),
    createParagraph('En el bucle `runAnthropicLoop`, cuando Claude decide invocar una herramienta (tool_use), el resultado de la función se ejecuta mediante `runTool`. Si la herramienta falla (por ejemplo, la DIAN rechaza una cédula), el backend NO aborta la llamada:'),
    createCodeBlock(
`// Si la herramienta devuelve un error, se envía a Claude con is_error: true
messages.push({
  role: 'user',
  content: [
    {
      type: 'tool_result',
      tool_use_id: tool.id,
      content: JSON.stringify(result),
      is_error: !result.ok,
    },
  ],
});`, 'JavaScript (agentService.js)'
    ),
    createParagraph('Al recibir el flag `is_error: true`, Claude entiende qué regla falló y le explica al usuario en palabras sencillas el motivo del rechazo, sugiriendo una corrección inmediata.'),

    createHeading3('C. Auto-Degradación Transparente (Fallback Trigger)'),
    createParagraph('Si la API Key de Anthropic vence, carece de créditos o es revocada durante una demostración en vivo, la variable `claudeRejectedKey` se marca en `true`. En lugar de arrojar un error 500 y colgar la llamada, el sistema cambia instantáneamente en ese mismo turno al asistente guiado determinista (`fallbackAgent`), permitiendo terminar la factura con normalidad.'),

    createHeading2('5.2. Catálogo de Herramientas Conversacionales (tools.js)'),
    createParagraph('El modelo cuenta con un catálogo de herramientas precisas con esquemas JSON Schema completos:'),
    
    createTable(
      ['Nombre de la Herramienta', 'Parámetros Principales', 'Efecto en el Negocio'],
      [
        ['update_customer', 'identification, names, company, city, email...', 'Guarda o actualiza los datos del comprador en el borrador en memoria.'],
        ['add_item', 'name, price, quantity, tax_rate', 'Agrega un ítem al borrador, calculando la tarifa de IVA sugerida (19% por defecto).'],
        ['remove_item', 'name', 'Busca por similitud fonética y elimina un producto ingresado por equivocación.'],
        ['set_payment_method', 'form (contado/crédito), method (efectivo/transferencia...)', 'Mapea la forma de pago a códigos DIAN oficiales.'],
        ['get_draft_summary', 'ninguno', 'Calcula subtotales, IVA y total para que el agente lea el resumen antes de emitir.'],
        ['create_invoice', 'ninguno', 'Genera el reference_code, emite ante la DIAN y abre el cobro en Factus Pay.'],
        ['delete_invoice', 'reference_code o número', 'Aplica la regla legal: destruye si no está validada, o emite Nota Crédito Concepto 2.'],
        ['create_credit_note', 'bill_number, reason (devolucion, descuento...)', 'Emite nota crédito parcial sobre una factura previa.'],
        ['start_over', 'ninguno', 'Limpia el borrador para iniciar una nueva venta desde cero.'],
      ]
    ),

    createParagraph('', { spacingAfter: 140 }),
    createHeading2('5.3. El Asistente Guiado Determinista (fallbackAgent.js)'),
    createParagraph('Para garantizar autonomía total sin depender de modelos externos ni incurrir en costos de tokens, `fallbackAgent.js` implementa una Máquina de Estados Finita (FSM) que guía al usuario mediante la variable `session.flowStep`:'),
    createBullet('1. ask_customer_name ➔ Solicita el nombre o razón social.', 'Paso 1:'),
    createBullet('2. ask_customer_id ➔ Solicita la cédula o NIT (filtra caracteres numéricos).', 'Paso 2:'),
    createBullet('3. ask_customer_city ➔ Pregunta el municipio para resolver DIVIPOLA (admite "omitir").', 'Paso 3:'),
    createBullet('4. ask_item_name ➔ Pregunta qué producto o servicio vendió.', 'Paso 4:'),
    createBullet('5. ask_item_price ➔ Pregunta el valor (utiliza parseAmount para interpretar "120 mil").', 'Paso 5:'),
    createBullet('6. ask_more_items ➔ Pregunta si desea añadir otro producto.', 'Paso 6:'),
    createBullet('7. ask_payment_method ➔ Pregunta si paga en efectivo, transferencia o tarjeta.', 'Paso 7:'),
    createBullet('8. confirm_summary ➔ Lee el total con IVA y pide confirmación afirmativa para emitir.', 'Paso 8:'),

    createHeading2('5.4. Algoritmos de Procesamiento de Lenguaje Natural (textParsing.js)'),
    createParagraph('El reconocimiento de voz del navegador devuelve cadenas de texto informales. `textParsing.js` convierte esas expresiones en valores tipados:'),

    createHeading3('A. Interpretación de Montos en Pesos Colombianos (parseAmount)'),
    createParagraph('Un usuario puede decir "cincuenta mil", "120k", "tres millones y medio" o "$50.000". La función aplica una cascada de expresiones regulares especializadas:'),
    createCodeBlock(
`export function parseAmount(text) {
  if (text == null) return null;
  const normalized = clean(text);

  // Maneja "350 mil" o "120k"
  const thousands = normalized.match(/(\\d+(?:[.,]\\d+)?)\\s*(mil|k)\\b/);
  if (thousands) return Math.round(parseFloat(thousands[1].replace(',', '.')) * 1000);

  // Maneja "2 millones"
  const millions = normalized.match(/(\\d+(?:[.,]\\d+)?)\\s*(millones|millon)/);
  if (millions) return Math.round(parseFloat(millions[1].replace(',', '.')) * 1_000_000);

  // Maneja números formateados con puntuación colombiana ("50.000")
  const numeric = normalized.match(/\\d[\\d.,]*/);
  if (numeric) {
    const [integer, cents] = numeric[0].split(/,(?=\\d{1,2}$)/);
    const value = Number(\`\${integer.replace(/[.,]/g, '')}\${cents ? \`.\${cents}\` : ''}\`);
    return value > 0 ? value : null;
  }

  return wordsToNumber(normalized);
}`, 'JavaScript (textParsing.js)'
    ),

    createHeading3('B. Manejo de Tildes y Límites de Palabra (Regex sin \\b)'),
    createParagraph('En JavaScript estándar, el selector de frontera de palabra `\\b` no reconoce letras con tildes (como la "í" de "sí"), interpretando erróneamente el fin de palabra. El código soluciona este problema artesanalmente:'),
    createCodeBlock(
`const END = '(?=$|[\\\\s,.;:!?¡¿])';
const AFFIRMATIVE = new RegExp(\`^(s[ií]|claro|correcto|dale|ok|okay|vale|exacto|afirmativo|listo|confirmo|hazlo)\${END}\`, 'i');
const NEGATIVE = new RegExp(\`^(no|negativo|nop|cancela|mejor no)\${END}\`, 'i');`, 'JavaScript (textParsing.js)'
    ),
    createParagraph('Esto permite que cuando el usuario responde afirmativamente ("¡Sí!", "dale", "listo"), el sistema proceda inmediatamente a la emisión sin vacilar.'),
  ];
}
