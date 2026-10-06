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

export function getChapter2() {
  return [
    pageBreak(),
    createHeading1('CAPÍTULO 2: ARQUITECTURA GLOBAL DEL SISTEMA'),
    
    createHeading2('2.1. Filosofía de Diseño y Flujo Unidireccional'),
    createParagraph('La arquitectura de Factus Voz fue diseñada bajo principios estrictos de Arquitectura Limpia (Clean Architecture) y separación rigurosa de responsabilidades (Separation of Concerns). En todo el código se respeta una regla inquebrantable de dependencia unidireccional:'),
    createParagraph('Frontend (React) ➔ Rutas Express ➔ Controladores ➔ Servicios de Dominio ➔ Clientes de Red (API).', { bold: true }),
    createParagraph('Ninguna capa superior se salta a la intermedia. Por ejemplo, los controladores jamás importan Axios ni hacen llamadas HTTP directas a Factus; todo pasa obligatoriamente por los servicios de negocio (`services/`), y estos a su vez se comunican con los adaptadores de infraestructura (`api/`).'),

    createTable(
      ['Capa de Software', 'Directorio en Código', 'Responsabilidad Exclusiva'],
      [
        ['Presentación Web', 'frontend/src/', 'Captura de voz (Web Speech API), renderizado visual, visor de factura tipo billete de seguridad y paneles reactivos.'],
        ['Transporte HTTP', 'backend/src/routes/, controllers/', 'Enrutamiento Express, validación de parámetros de entrada, serialización y códigos de estado HTTP.'],
        ['Inteligencia Conversacional', 'backend/src/agent/', 'Gestión del diálogo con Claude o máquina de estados guiada, parsing de lenguaje natural y ejecución de tools.'],
        ['Servicios de Negocio', 'backend/src/services/', 'Reglas tributarias colombianas, selección de rangos DIAN, cálculo matemático de impuestos, anulación legal e idempotencia.'],
        ['Acceso a Datos / Red', 'backend/src/api/', 'Clientes HTTP Axios puros hacia Factus y Factus Pay, fábrica de peticiones, simulación mock y gestión de tokens OAuth2.'],
      ]
    ),

    createParagraph('', { spacingAfter: 140 }),
    createHeading2('2.2. El Principio de Desacoplamiento Radical'),
    createParagraph('Uno de los mayores aciertos de ingeniería del proyecto es el desacoplamiento entre el agente de voz y la API fiscal:'),
    createBullet('El agente de inteligencia artificial (Claude o el Asistente Guiado) NO sabe qué es un JSON de Factus, ni qué es un "line_extension_amount", ni conoce endpoints como POST /v2/bills/validate. El agente solo manipula un "borrador" plano (draft) compuesto por un cliente, una lista de ítems simples y una preferencia de pago.', 'El Agente es Agnóstico a Factus:'),
    createBullet('Los clientes de red no saben nada de texto en español, comandos de voz ni frases como "factúrame 120 mil". Solo reciben objetos estrictos y retornan respuestas HTTP.', 'La Red es Agnóstica a la Voz:'),
    createBullet('El módulo `documentBuilder.js` es el único traductor oficial que convierte el borrador simplificado del agente en el payload formal requerido por la DIAN y Factus. Si la DIAN cambia un nombre de propiedad en su esquema UBL 2.1, únicamente se edita ese archivo sin alterar una sola línea del agente ni del frontend.', 'El Puente Único (documentBuilder):'),

    createCallout(
      'DISEÑO RESILIENTE ANTE SERVERLESS',
      'Factus Voz está optimizado para ejecutarse en entornos serverless sin estado (como Vercel o AWS Lambda). Como las funciones serverless pueden morir entre petición y petición, el estado de la sesión conversacional (el borrador de factura y el historial) viaja en el payload hacia el navegador y regresa en cada turno. Si una función serverless se apaga, la siguiente instancia reconstruye la conversación al instante.',
      'IMPORTANT'
    ),

    createHeading2('2.3. Estrategia de Idempotencia y Prevención de Duplicados'),
    createParagraph('En operaciones transaccionales donde hay dinero e impuestos involucrados, un fallo de red o un doble clic del usuario podría generar facturas duplicadas ante la DIAN, acarreando graves sanciones contables. Factus Voz resuelve esto mediante dos mecanismos de idempotencia matemática:'),

    createHeading3('A. Generación Anticipada del Reference Code en Facturas'),
    createParagraph('Cuando el agente comienza a construir una factura, genera inmediatamente un código de referencia único con el formato `FACT-YYYYMMDD-XXXXXXXX` (ej. `FACT-20261005-9F3A1C2B`) utilizando bytes aleatorios de `node:crypto`. Este código se guarda en el borrador ANTES de tocar la red.'),
    createParagraph('Si la conexión a Internet se interrumpe durante el POST /v2/bills/validate y el cliente reintenta la llamada, la API de Factus reconoce la referencia existente y devuelve la factura ya emitida en lugar de crear un duplicado.'),

    createHeading3('B. Referencias Determinísticas para Notas Crédito de Anulación'),
    createParagraph('Al anular una factura, el sistema no inventa una referencia aleatoria. Utiliza la fórmula determinística:'),
    createCodeBlock(`export function cancellationReference(invoice) {\n  return \`ANUL-\${invoice.reference_code || invoice.number}\`;\n}`, 'JavaScript (creditNoteService.js)'),
    createParagraph('Gracias a esta fórmula, si el usuario dice "anula la factura" dos veces, o si la llamada HTTP sufre un timeout y se reintenta, Factus detecta que la nota crédito `ANUL-FACT-20261005-9F3A1C2B` ya existe y devuelve el documento previo sin generar una segunda nota crédito que descuadre la contabilidad.'),

    createHeading2('2.4. Jerarquía de Errores y Diagnóstico Inteligente (ApiError)'),
    createParagraph('En la mayoría de aplicaciones, los errores de validación de APIs fiscales se muestran como códigos HTTP genéricos (ej. "Error 422: Unprocessable Entity"), dejando al usuario a ciegas. Factus Voz implementa una clase especializada `ApiError` que intercepta la respuesta de Factus y extrae el primer mensaje de validación real:'),
    createCodeBlock(
`export class ApiError extends Error {
  constructor(message, { source = 'app', statusCode = 500, details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.source = source;
    this.statusCode = statusCode;
    this.details = details;
  }

  static fromAxiosError(error, source) {
    if (!error.response) {
      const reason = error.code === 'ECONNABORTED' ? 'tardo demasiado en responder' : 'no respondio';
      return new ApiError(\`El servicio \${source} \${reason}. Intenta de nuevo en un momento.\`, {
        source, statusCode: 504,
      });
    }

    const statusCode = error.response.status;
    const details = error.response.data || null;
    const base = details?.message || details?.error || \`Error \${statusCode} en \${source}\`;
    const firstValidation = firstErrorMessage(details?.data?.errors ?? details?.errors);
    const message = firstValidation && !base.includes(firstValidation) ? \`\${base}: \${firstValidation}\` : base;

    return new ApiError(message, { source, statusCode, details });
  }
}`, 'JavaScript (ApiError.js)'
    ),
    createParagraph('La función `firstErrorMessage` examina estructuras complejas devueltas por la DIAN (como listas de reglas UBL: `"FAK24: El municipio no corresponde al departamento"`) y extrae la oración exacta. De esta manera, el agente conversacional puede leer en voz alta: *"No pude emitir la factura porque el municipio no corresponde al departamento"*, guiando al usuario hacia la solución inmediata.'),

    createHeading2('2.5. Dualidad de Entornos: Modo Real vs. Mock Sandbox'),
    createParagraph('Para facilitar la evaluación en hackathons, entornos de prueba y demostraciones sin conexión a Internet o sin credenciales, el backend cuenta con una arquitectura de dualidad completa gobernada por la variable de entorno `MOCK_MODE`:'),
    createBullet('Consume los endpoints reales de https://api-sandbox.factus.com.co y https://pay-api-sandbox.factus.com.co. Valida contra la DIAN y genera CUFE real.', 'MOCK_MODE=false (Sandbox / Producción):'),
    createBullet('El backend activa el módulo en memoria `factusSandbox.js`. Este módulo emula con exactitud quirúrgica el comportamiento de Factus: genera folios secuenciales, calcula CUFE ficticios con prefijo mock-, rechaza intentos de borrar facturas con código 409 e incluso simula el retardo del QR de Factus Pay.', 'MOCK_MODE=true (Simulador Local Autónomo):'),
    createParagraph('Además, si el desarrollador no configura credenciales en su archivo `.env`, el archivo `backend/src/config/env.js` incluye credenciales sandbox por defecto válidas, garantizando que el proyecto funcione en el primer segundo tras clonar el repositorio ("Zero-Config Setup").'),
  ];
}
