import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Envuelve la Web Speech API (reconocimiento de voz nativo del navegador).
 * No sabe nada de facturas ni del backend: solo convierte voz -> texto y
 * avisa cuando hay una frase final lista para procesar.
 */
export function useSpeechRecognition({ onResult, lang = 'es-CO' } = {}) {
  const SpeechRecognitionImpl =
    typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [supported] = useState(Boolean(SpeechRecognitionImpl));

  useEffect(() => {
    if (!SpeechRecognitionImpl) return;

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalChunk = '';
      let interimChunk = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalChunk += transcript;
        else interimChunk += transcript;
      }

      if (finalChunk.trim()) {
        setInterimText('');
        onResultRef.current?.(finalChunk.trim());
      } else {
        setInterimText(interimChunk);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;

    return () => recognition.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, SpeechRecognitionImpl]);

  const start = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      // ya estaba iniciado; ignorar
    }
  }, [isListening]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { supported, isListening, interimText, start, stop };
}
