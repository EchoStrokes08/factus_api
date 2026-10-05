import { useEffect, useRef, useState } from 'react';
import { backendClient } from '../../api/backendClient.js';
import { useSpeechRecognition } from './useSpeechRecognition.js';
import { useSpeechSynthesis } from './useSpeechSynthesis.js';
import './CallScreen.css';

function createSessionId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

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

  const sessionIdRef = useRef(createSessionId());
  const callStateRef = useRef(callState);
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const synthesis = useSpeechSynthesis();
  const recognition = useSpeechRecognition({ onResult: handleUserUtterance });

  async function handleUserUtterance(text) {
    if (!text?.trim()) return;
    recognition.stop();
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setThinking(true);

    try {
      const data = await backendClient.sendAgentMessage(sessionIdRef.current, text);
      setEngine(data.engine);
      setMessages((prev) => [...prev, { role: 'agent', text: data.reply }]);
      onActivity?.();
      synthesis.speak(data.reply, {
        onEnd: () => {
          if (callStateRef.current === 'active') recognition.start();
        },
      });
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'error', text: error.message }]);
    } finally {
      setThinking(false);
    }
  }

  async function startCall() {
    setCallState('connecting');
    setMessages([]);
    setThinking(true);
    try {
      const data = await backendClient.sendAgentMessage(sessionIdRef.current, '');
      setEngine(data.engine);
      setMessages([{ role: 'agent', text: data.reply }]);
      setCallState('active');
      synthesis.speak(data.reply, { onEnd: () => recognition.start() });
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
  }

  function submitText(event) {
    event.preventDefault();
    if (!textInput.trim()) return;
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
        <div className="call-status">{statusLabel}</div>
        <div className="call-interim">{recognition.interimText}</div>
        {engine && (
          <span className="engine-badge">{engine === 'claude' ? 'IA conversacional' : 'Asistente guiado'}</span>
        )}
      </div>

      <div className="transcript-log scrollbar-thin">
        {messages.map((message, index) => (
          <div key={index} className={`transcript-bubble ${message.role}`}>
            {message.text}
          </div>
        ))}
      </div>

      {callState === 'active' && (
        <form className="text-fallback" onSubmit={submitText}>
          <input
            type="text"
            placeholder="O escribe aqui si prefieres no hablar..."
            value={textInput}
            onChange={(event) => setTextInput(event.target.value)}
          />
          <button type="submit">Enviar</button>
        </form>
      )}

      {!recognition.supported && callState === 'active' && (
        <p className="support-notice">
          Tu navegador no soporta reconocimiento de voz; usa el campo de texto de arriba para hablar con el agente.
        </p>
      )}
    </div>
  );
}
