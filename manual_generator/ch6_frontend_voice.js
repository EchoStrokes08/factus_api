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

export function getChapter6() {
  return [
    pageBreak(),
    createHeading1('CAPÍTULO 6: FRONTEND REACT Y LA INTERFAZ DE VOZ'),
    
    createHeading2('6.1. Integración con Web Speech API (useSpeechRecognition.js)'),
    createParagraph('El hook personalizado `useSpeechRecognition.js` aísla completamente la complejidad de la Web Speech API nativa del navegador (`window.SpeechRecognition || window.webkitSpeechRecognition`), exponiendo una interfaz limpia de control (start, stop, isListening, interimText):'),

    createHeading3('A. Prevención de Stale Closures mediante useRef'),
    createParagraph('En React, cuando un callback asíncrono (como el final de la lectura de voz del sintetizador) llama a `start()`, el estado de React dentro de ese closure puede estar desactualizado. Para evitar desincronizaciones críticas donde el micrófono cree estar apagado cuando en realidad está escuchando, el hook mantiene una doble referencia:'),
    createCodeBlock(
`// start()/stop() se llaman desde callbacks asíncronos (fin del TTS),
// así que el estado real va en un ref; el useState es solo para pintar la UI.
const listeningRef = useRef(false);
const [isListening, setIsListening] = useState(false);

const setListening = useCallback((value) => {
  listeningRef.current = value;
  setIsListening(value);
}, []);`, 'JavaScript (useSpeechRecognition.js)'
    ),

    createHeading3('B. Mecanismo de Auto-Reinicio Continuo (Chrome OnEnd Hack)'),
    createParagraph('Los motores basados en Chromium (Google Chrome, Microsoft Edge) tienen un comportamiento agresivo: tras 3 a 5 segundos de silencio ambiental, disparan automáticamente el evento `onend` y apagan el micrófono. El hook soluciona este comportamiento verificando si la aplicación deseaba seguir escuchando y reiniciando el servicio de inmediato:'),
    createCodeBlock(
`recognition.onend = () => {
  if (!listeningRef.current) {
    setIsListening(false);
    return;
  }
  try {
    recognition.start();
  } catch {
    setListening(false);
  }
};`, 'JavaScript (useSpeechRecognition.js)'
    ),

    createHeading3('C. Manejo de Texto Interino y Texto Definitivo'),
    createParagraph('El evento `onresult` itera sobre los fragmentos de audio devueltos por la red neuronal del navegador. Si un fragmento es interino (`!event.results[i].isFinal`), se guarda en `interimText` para mostrarle al usuario en tiempo real que el sistema lo está escuchando. Apenas el fragmento se consolida como final (`isFinal === true`), se vacía el borrador y se emite la frase final al backend.'),

    createHeading2('6.2. Síntesis de Voz y Locución (useSpeechSynthesis.js)'),
    createParagraph('El hook `useSpeechSynthesis.js` gestiona la respuesta auditiva del agente utilizando `window.speechSynthesis`:'),
    createBullet('Filtra las voces instaladas en el sistema operativo buscando preferentemente aquellas con código es-CO (Español de Colombia) o en su defecto es-419 / es-ES.', 'Selección de Acento:'),
    createBullet('Antes de pronunciar una nueva frase, invoca window.speechSynthesis.cancel() para evitar que se acumulen locuciones previas si el usuario interrumpe al agente.', 'Cancelación Preventiva de Colisiones:'),
    createBullet('Dispara un callback onEnd al finalizar la última sílaba, indicándole a la pantalla de llamada que reabra el micrófono para escuchar la réplica del usuario.', 'Sincronización de Turnos:'),

    createHeading2('6.3. Pantalla de Llamada Interactiva (CallScreen.jsx)'),
    createParagraph('`CallScreen.jsx` implementa una máquina de estados visual con 6 estados legibles desde varios metros de distancia:'),
    createBullet('IDLE: Teléfono colgado. Botón central verde listo para iniciar la llamada.', '1. En Reposo:'),
    createBullet('CONNECTING: Saludando al usuario y cargando el motor de inteligencia artificial.', '2. Conectando:'),
    createBullet('LISTENING: Micrófono abierto, roseta de guilloche animada pulsando con ondas reactivas.', '3. Escuchando:'),
    createBullet('THINKING: Esperando la respuesta del backend (Claude o máquina de estados).', '4. Procesando:'),
    createBullet('SPEAKING: El agente habla en voz alta; el micrófono se silencia para no escucharse a sí mismo.', '5. Hablando:'),
    createBullet('ERROR: Notificación visual del fallo con opción de reintentar con un solo clic.', '6. Error:'),
    createParagraph('Además, incluye un campo de texto interactivo siempre visible: si el usuario está en un entorno ruidoso o el navegador no soporta micrófono, puede teclear sus respuestas sin perder ninguna funcionalidad.'),

    createHeading2('6.4. El Visor de Factura en Papel de Seguridad (InvoiceViewer.jsx)'),
    createParagraph('El visor modal de facturas (`InvoiceViewer.jsx`) abandona el aspecto de una tabla web genérica para emular un **documento de valor físico impreso en papel de seguridad**:'),
    createBullet('Marco perimetral guilloche vectorial con micro-tramas geométricas idénticas a las de los cheques bancarios.', '1. Trama de Seguridad:'),
    createBullet('Folios impresos en tipografía monoespaciada roja serial (ej. SETP990001045) y totales en tinta intaglio verde esmeralda.', '2. Tipografía Fiscal:'),
    createBullet('Si la factura fue anulada legalmente con Nota Crédito Concepto 2, el documento muestra en diagonal un sello rojo semitransparente con la leyenda "ANULADA ANTE LA DIAN · NC: ...", deshabilitando cualquier botón de cobro.', '3. Sello de Anulación:'),
    createBullet('Ejecuta un efecto useEffect con intervalo de 3.000 ms consultando GET /api/invoices/:ref/collection. Tan pronto como Factus Pay genera el QR, la imagen aparece suavemente en pantalla lista para escanear con la cámara del celular.', '4. Sondeo Asíncrono del QR:'),
    createBullet('Estilos CSS específicos (@media print) que ocultan botones de la interfaz y formatean el documento para impresión nítida en impresoras térmicas de 80 mm o en hojas carta PDF.', '5. Optimización de Impresión:'),

    createHeading2('6.5. Sistema de Diseño Visual (theme.css)'),
    createParagraph('El archivo `theme.css` contiene más de 1.700 líneas de CSS Vanilla puro estructurado mediante variables CSS semánticas:'),
    createBullet('--color-intaglio-900 (#0B3B2B), --color-intaglio-500 (#1B4D3E), inspirados en billetes de curso legal.', 'Paleta de Tintas:'),
    createBullet('--color-security-paper (#F9F8F3), que replica el tono marfil del papel de algodón con fibra de seguridad.', 'Fondo Fiduciario:'),
    createBullet('Respeto estricto a las preferencias del usuario: si el sistema detecta @media (prefers-reduced-motion: reduce), desactiva giros complejos de la roseta y reduce las transiciones visuales.', 'Accesibilidad Total:'),
  ];
}
