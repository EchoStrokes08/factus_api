import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUp, Phone, PhoneOff } from 'lucide-react';
import { backendClient } from '../../api/backendClient.js';
import { GuillocheSeal, LiveRosette } from '../../components/Guilloche.jsx';
import { InvoiceViewer } from '../documents/InvoiceViewer.jsx';
import { formatMoney, normalizeInvoice } from '../documents/documentModel.js';
import { useSpeechRecognition } from './useSpeechRecognition.js';
import { useSpeechSynthesis } from './useSpeechSynthesis.js';
import './CallScreen.css';

function createSessionId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const clock = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });

const SPEAKER = { agent: 'Agente', user: 'Tú', error: 'Error' };

const STEPS = [
  { title: 'Llama', text: 'Activa el micrófono con un toque.' },
  { title: 'Conversa', text: 'Dile al agente el cliente, los productos y cómo paga.' },
  { title: 'Recibe', text: 'La factura llega validada por la DIAN, con CUFE y su cobro en Factus Pay.' },
];

/**
 * Pantalla principal: una "llamada" con un agente de IA en vez de un
 * formulario. Orquesta STT -> backend del agente -> TTS, y delega en
 * backendClient toda comunicacion de red (nunca llama a Factus directo).
 */
export function CallScreen({ onActivity, onEngine }) {
  const [callState, setCallState] = useState('idle'); // idle | connecting | active
  const [messages, setMessages] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [openInvoice, setOpenInvoice] = useState(null);

  const sessionIdRef = useRef(createSessionId());
  // Estado de la conversacion que devuelve el backend y se le reenvia en
  // cada turno: en serverless cada peticion puede ir a otra instancia.
  const agentStateRef = useRef(null);
  // Evita enviar un segundo mensaje mientras el agente aun responde el primero.
  const busyRef = useRef(false);
  const callStateRef = useRef(callState);
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // "Energia" de voz que deforma el roseton: cada palabra la sube y decae sola.
  const energyRef = useRef(0);
  const pulse = (amount = 1) => {
    energyRef.current = Math.min(energyRef.current + amount, 1.6);
  };

  const logRef = useRef(null);

  const synthesis = useSpeechSynthesis();
  const recognition = useSpeechRecognition({ onResult: handleUserUtterance });

  useEffect(() => {
    if (recognition.interimText) pulse(0.7);
  }, [recognition.interimText]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  async function sendToAgent(text) {
    const data = await backendClient.sendAgentMessage(sessionIdRef.current, text, agentStateRef.current);
    agentStateRef.current = data.state ?? null;
    onEngine?.(data.engine);
    return data;
  }

  function agentMessages(data) {
    const at = new Date();
    const result = [{ role: 'agent', text: data.reply, at }];
    if (data.document) result.push({ role: 'document', invoice: data.document, at });
    return result;
  }

  function listenAfterSpeaking(text) {
    synthesis.speak(text, {
      onWord: () => pulse(0.8),
      onEnd: () => {
        // Si la voz se corto porque el usuario escribio, no abrir el microfono
        // mientras ese mensaje se procesa.
        if (callStateRef.current === 'active' && !busyRef.current) recognition.start();
      },
    });
  }

  async function handleUserUtterance(text) {
    if (!text?.trim() || busyRef.current) return;
    busyRef.current = true;
    recognition.stop();
    pulse(1.2);
    setMessages((prev) => [...prev, { role: 'user', text, at: new Date() }]);
    setThinking(true);

    try {
      const data = await sendToAgent(text);
      setMessages((prev) => [...prev, ...agentMessages(data)]);
      // Solo un documento emitido o anulado cambia el historial y el rango.
      if (data.document) onActivity?.();
      listenAfterSpeaking(data.reply);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'error', text: error.message, at: new Date() }]);
      if (callStateRef.current === 'active') recognition.start();
    } finally {
      busyRef.current = false;
      setThinking(false);
    }
  }

  async function startCall() {
    setCallState('connecting');
    setMessages([]);
    setThinking(true);
    agentStateRef.current = null;
    try {
      const data = await sendToAgent('');
      setMessages(agentMessages(data));
      setCallState('active');
      callStateRef.current = 'active';
      listenAfterSpeaking(data.reply);
    } catch (error) {
      setMessages([{ role: 'error', text: error.message, at: new Date() }]);
      setCallState('idle');
    } finally {
      setThinking(false);
    }
  }

  function endCall() {
    recognition.stop();
    synthesis.cancel();
    setCallState('idle');
    backendClient.endAgentSession(sessionIdRef.current).catch(() => {});
    sessionIdRef.current = createSessionId();
    agentStateRef.current = null;
  }

  function submitText(event) {
    event.preventDefault();
    if (!textInput.trim() || busyRef.current) return;
    synthesis.cancel();
    handleUserUtterance(textInput.trim());
    setTextInput('');
  }

  const mood = (() => {
    if (callState === 'idle') return 'idle';
    if (callState === 'connecting') return 'connecting';
    if (thinking) return 'thinking';
    if (synthesis.isSpeaking) return 'speaking';
    if (recognition.isListening) return 'listening';
    return 'active';
  })();

  const status = {
    idle: { word: 'Llamar', hint: 'Toca para iniciar la llamada con el agente' },
    connecting: { word: 'Conectando', hint: 'Abriendo la línea con el agente…' },
    thinking: { word: 'Pensando', hint: 'El agente está procesando lo que dijiste' },
    speaking: { word: 'Hablando', hint: 'Escucha al agente; luego te toca' },
    listening: { word: 'Escuchando', hint: 'Habla con naturalidad' },
    active: { word: 'En llamada', hint: 'Escribe abajo para responder' },
  }[mood];

  const isIdle = callState === 'idle';
  const hasConversation = messages.length > 0;
  // La banda del turno en curso cae en la ultima fila de texto, no en la ficha de factura.
  const lastIndex = messages.findLastIndex((message) => message.role !== 'document');

  return (
    <div className={`call-screen ${isIdle && !hasConversation ? 'is-resting' : 'is-live'}`} data-mood={mood}>
      <section className="call-stage" aria-label="Llamada con el agente">
        <div className="call-dial">
          <LiveRosette mood={mood} energyRef={energyRef} />
          <button
            type="button"
            className={`call-button ${isIdle ? '' : 'hangup'}`}
            onClick={isIdle ? startCall : endCall}
            disabled={callState === 'connecting'}
            aria-label={isIdle ? 'Llamar al agente' : 'Colgar'}
          >
            {isIdle || callState === 'connecting' ? (
              <Phone size={34} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <PhoneOff size={34} strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>
        </div>

        <div className="call-readout">
          <p className="call-state" aria-live="polite">
            {status.word}
          </p>
          <p className="call-hint">{recognition.interimText || status.hint}</p>
        </div>
      </section>

      {isIdle && !hasConversation && (
        <section className="call-steps" aria-labelledby="call-steps-title">
          <h2 id="call-steps-title" className="visually-hidden">
            Cómo funciona
          </h2>
          <ol>
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="serial call-step-index">{index + 1}</span>
                <span>
                  <strong>{step.title}</strong>
                  {step.text}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {hasConversation && (
        <ol className="transcript-log" ref={logRef} aria-label="Transcripción de la llamada">
          {messages.map((message, index) =>
            message.role === 'document' ? (
              <li key={index} className="transcript-row document">
                <InvoiceSlip invoice={message.invoice} onOpen={() => setOpenInvoice(message.invoice)} />
              </li>
            ) : (
              <li
                key={index}
                className={`transcript-row ${message.role} ${index === lastIndex && !thinking ? 'current' : ''}`}
              >
                <span className="transcript-speaker">{SPEAKER[message.role]}</span>
                <p className="transcript-text">{message.text}</p>
                <time className="transcript-time serial" dateTime={message.at?.toISOString()}>
                  {message.at ? clock.format(message.at) : ''}
                </time>
              </li>
            ),
          )}
          {thinking && callState === 'active' && (
            <li className="transcript-row agent current pending" aria-label="El agente está pensando">
              <span className="transcript-speaker">Agente</span>
              <p className="transcript-text">
                <span className="thinking-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </p>
            </li>
          )}
        </ol>
      )}

      {callState === 'active' && (
        <form className="text-fallback" onSubmit={submitText}>
          <label className="visually-hidden" htmlFor="agent-text">
            Escribe tu mensaje al agente
          </label>
          <input
            id="agent-text"
            type="text"
            autoComplete="off"
            placeholder="O escribe aquí si prefieres no hablar…"
            value={textInput}
            onChange={(event) => setTextInput(event.target.value)}
          />
          <button type="submit" disabled={thinking || !textInput.trim()} aria-label="Enviar mensaje">
            <ArrowUp size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </form>
      )}

      {!recognition.supported && callState === 'active' && (
        <p className="support-notice">
          Tu navegador no soporta reconocimiento de voz; usa el campo de texto para hablar con el agente.
        </p>
      )}

      <InvoiceViewer invoice={openInvoice} onClose={() => setOpenInvoice(null)} />
    </div>
  );
}

function InvoiceSlip({ invoice, onOpen }) {
  const view = normalizeInvoice(invoice);
  const folio = view.number || view.referenceCode;
  const status = view.isVoided
    ? `Anulada con ${view.voidedBy[0]}`
    : [view.isValidated ? 'Validada DIAN' : 'Sin validar', view.isSimulated && 'Simulada'].filter(Boolean).join(' · ');
  return (
    <button type="button" className={`invoice-slip ${view.isVoided ? 'is-voided' : ''}`} onClick={onOpen}>
      <GuillocheSeal seed={view.cufe || folio} size={56} className="invoice-slip-seal" />
      <span className="invoice-slip-body">
        <span className="invoice-slip-title">
          Factura <span className="serial invoice-slip-folio">{folio}</span>
        </span>
        <span className="invoice-slip-meta">
          {view.customerName} · {status}
        </span>
      </span>
      <span className="invoice-slip-total">
        <strong>{formatMoney(view.total)}</strong>
        <span className="invoice-slip-cta">
          Ver factura <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}
