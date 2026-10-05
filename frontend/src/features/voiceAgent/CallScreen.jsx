import { useEffect, useRef, useState } from 'react';
import { backendClient } from '../../api/backendClient.js';
import { InvoiceViewer, normalizeInvoice } from '../documents/InvoiceViewer.jsx';
import { useSpeechRecognition } from './useSpeechRecognition.js';
import { useSpeechSynthesis } from './useSpeechSynthesis.js';
import './CallScreen.css';

function createSessionId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

/**
 * Pantalla principal: una "llamada" con un agente de IA en vez de un
 * formulario. Orquesta STT -> backend del agente -> TTS, y delega en
 * backendClient toda comunicacion de red (nunca llama a Factus directo).
 */
export function CallScreen({ onActivity }) {
  const [callState, setCallState] = useState('idle'); // idle | connecting | active
  const [messages, setMessages] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [engine, setEngine] = useState(null);
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

  const synthesis = useSpeechSynthesis();
  const recognition = useSpeechRecognition({ onResult: handleUserUtterance });

  async function sendToAgent(text) {
    const data = await backendClient.sendAgentMessage(sessionIdRef.current, text, agentStateRef.current);
    agentStateRef.current = data.state ?? null;
    setEngine(data.engine);
    return data;
  }

  function agentMessages(data) {
    const result = [{ role: 'agent', text: data.reply }];
    if (data.document) result.push({ role: 'document', invoice: data.document });
    return result;
  }

  function listenAfterSpeaking(text) {
    synthesis.speak(text, {
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
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setThinking(true);

    try {
      const data = await sendToAgent(text);
      setMessages((prev) => [...prev, ...agentMessages(data)]);
      onActivity?.();
      listenAfterSpeaking(data.reply);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'error', text: error.message }]);
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
      setMessages([{ role: 'error', text: error.message }]);
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

  const statusLabel = (() => {
    if (callState === 'idle') return 'Toca para iniciar la llamada con el agente';
    if (thinking) return 'Pensando...';
    if (synthesis.isSpeaking) return 'Hablando...';
    if (recognition.isListening) return 'Escuchando...';
    return 'En llamada';
  })();

  const buttonClass = [
    'call-button',
    callState === 'active' ? 'hangup' : '',
    recognition.isListening ? 'listening' : '',
    synthesis.isSpeaking ? 'speaking' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="call-screen">
      <div className="call-stage">
        <button
          type="button"
          className={buttonClass}
          onClick={callState === 'idle' ? startCall : endCall}
          aria-label={callState === 'idle' ? 'Llamar al agente' : 'Colgar'}
        >
          <span className="pulse-ring" />
          {callState === 'idle' ? '📞' : '🔴'}
        </button>
        <div className="call-status" aria-live="polite">
          {statusLabel}
        </div>
        <div className="call-interim">{recognition.interimText}</div>
        {engine && (
          <span className="engine-badge">{engine === 'claude' ? 'IA conversacional' : 'Asistente guiado'}</span>
        )}
      </div>

      <div className="transcript-log scrollbar-thin">
        {messages.map((message, index) =>
          message.role === 'document' ? (
            <InvoiceBubble key={index} invoice={message.invoice} onOpen={() => setOpenInvoice(message.invoice)} />
          ) : (
            <div key={index} className={`transcript-bubble ${message.role}`}>
              {message.text}
            </div>
          ),
        )}
      </div>

      {callState === 'active' && (
        <form className="text-fallback" onSubmit={submitText}>
          <input
            type="text"
            placeholder="O escribe aqui si prefieres no hablar..."
            value={textInput}
            onChange={(event) => setTextInput(event.target.value)}
          />
          <button type="submit" disabled={thinking}>
            Enviar
          </button>
        </form>
      )}

      {!recognition.supported && callState === 'active' && (
        <p className="support-notice">
          Tu navegador no soporta reconocimiento de voz; usa el campo de texto de arriba para hablar con el agente.
        </p>
      )}

      <InvoiceViewer invoice={openInvoice} onClose={() => setOpenInvoice(null)} />
    </div>
  );
}

function InvoiceBubble({ invoice, onOpen }) {
  const view = normalizeInvoice(invoice);
  return (
    <button type="button" className="transcript-invoice" onClick={onOpen}>
      <span className="transcript-invoice-label">Factura creada</span>
      <span className="transcript-invoice-row">
        <strong>{view.number || view.referenceCode}</strong>
        <span>{money.format(view.total)}</span>
      </span>
      <span className="transcript-invoice-meta">{view.customerName}</span>
      <span className="transcript-invoice-cta">Ver factura →</span>
    </button>
  );
}
