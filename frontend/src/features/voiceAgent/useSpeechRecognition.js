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
  // start()/stop() se llaman desde callbacks asincronos (fin del TTS), asi
  // que el estado real va en un ref; el useState es solo para pintar la UI.
  const listeningRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [supported] = useState(Boolean(SpeechRecognitionImpl));

  const setListening = useCallback((value) => {
    listeningRef.current = value;
    setIsListening(value);
  }, []);

  useEffect(() => {
    if (!SpeechRecognitionImpl) return;

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      // Tras stop() el navegador aun puede entregar el audio pendiente como
      // resultado final; si ya no escuchamos, se descarta para no duplicar.
      if (!listeningRef.current) return;

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

    recognition.onerror = (event) => {
      // Sin permiso de microfono no tiene sentido reintentar.
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') listeningRef.current = false;
    };
    // Chrome corta la escucha tras unos segundos de silencio; si seguimos
    // en modo escucha, se reanuda sola para no obligar a repetir la frase.
    recognition.onend = () => {
      if (!listeningRef.current) {
        setIsListening(false);
        return;
      }
      try {
        recognition.start();
      } catch {
        setListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => recognition.abort();
  }, [lang, SpeechRecognitionImpl, setListening]);

  const start = useCallback(() => {
    if (!recognitionRef.current || listeningRef.current) return;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      // ya estaba iniciado; ignorar
    }
  }, [setListening]);

  const stop = useCallback(() => {
    setListening(false);
    setInterimText('');
    recognitionRef.current?.abort();
  }, [setListening]);

  return { supported, isListening, interimText, start, stop };
}
