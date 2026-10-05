import { useCallback, useRef, useState } from 'react';

/**
 * Envuelve la Web Speech Synthesis API (texto -> voz nativo del navegador).
 * Expone speak()/cancel() y un flag `isSpeaking` para animar la UI mientras
 * "habla" el agente.
 */
export function useSpeechSynthesis({ lang = 'es-CO' } = {}) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef(null);

  const speak = useCallback(
    (text, { onEnd } = {}) => {
      if (!supported || !text) {
        onEnd?.();
        return;
      }
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 1.02;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        onEnd?.();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        onEnd?.();
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [lang, supported],
  );

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [supported]);

  return { supported, isSpeaking, speak, cancel };
}
