import { useEffect, useMemo, useRef } from 'react';

const TAU = Math.PI * 2;

// Hash FNV-1a: la misma referencia/CUFE siempre produce el mismo sello.
function hashString(value) {
  let hash = 2166136261;
  const text = String(value || 'factus');
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function sealParams(seed) {
  const random = seededRandom(hashString(seed));
  return {
    petals: 7 + Math.floor(random() * 9),
    counter: 2 + Math.floor(random() * 5),
    depth: 0.06 + random() * 0.08,
    counterDepth: 0.02 + random() * 0.04,
    twist: random() * TAU,
    lines: 9 + Math.floor(random() * 4),
  };
}

function rosettePath(cx, cy, radius, params, lineIndex) {
  const { petals, counter, depth, counterDepth, twist, lines } = params;
  const t = lineIndex / (lines - 1);
  const base = radius * (0.42 + 0.5 * t);
  const phase = twist + t * Math.PI * 0.9;
  const steps = 240;
  let d = '';
  for (let s = 0; s <= steps; s += 1) {
    const theta = (s / steps) * TAU;
    const r =
      base +
      radius * depth * Math.sin(petals * theta + phase) +
      radius * counterDepth * Math.cos(counter * petals * theta - phase * 2);
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    d += `${s === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${d}Z`;
}

/**
 * Sello guilloche unico por documento, derivado de su CUFE o referencia:
 * funciona como la "marca de seguridad" visual de cada factura.
 */
export function GuillocheSeal({ seed, size = 48, className = '', title }) {
  const paths = useMemo(() => {
    const params = sealParams(seed);
    return Array.from({ length: params.lines }, (_, index) => rosettePath(50, 50, 46, params, index));
  }, [seed]);

  return (
    <svg
      className={`guilloche-seal ${className}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <circle cx="50" cy="50" r="49" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
      {paths.map((d, index) => (
        <path key={index} d={d} fill="none" stroke="currentColor" strokeWidth="0.55" opacity={0.35 + (index % 3) * 0.2} />
      ))}
    </svg>
  );
}

// Como se comporta el rosetón en cada estado de la llamada.
const MOODS = {
  idle: { amplitude: 0.05, speed: 0.12, spread: 0.55, alpha: 0.42 },
  connecting: { amplitude: 0.08, speed: 0.9, spread: 0.6, alpha: 0.55 },
  active: { amplitude: 0.05, speed: 0.18, spread: 0.5, alpha: 0.5 },
  listening: { amplitude: 0.07, speed: 0.25, spread: 0.42, alpha: 0.7 },
  thinking: { amplitude: 0.1, speed: 1.4, spread: 0.6, alpha: 0.6 },
  speaking: { amplitude: 0.09, speed: 0.4, spread: 0.52, alpha: 0.8 },
};

const LINE_COUNT = 16;

/**
 * Rosetón guilloche en vivo alrededor del boton de llamada. Cada palabra
 * reconocida o pronunciada llama a `pulse()` (via energyRef) y deforma las
 * lineas; el estado de la llamada cambia su ritmo y densidad.
 */
export function LiveRosette({ mood = 'idle', energyRef, color = '#8fb9a4', accent = '#e7efe8' }) {
  const canvasRef = useRef(null);
  const moodRef = useRef(mood);
  moodRef.current = mood;
  const redrawRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const current = { ...MOODS.idle };
    let phase = 0;
    let frame = 0;
    let last = performance.now();
    let size = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      size = rect.width;
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function draw(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const target = MOODS[moodRef.current] || MOODS.idle;
      const ease = reduceMotion ? 1 : 1 - Math.exp(-dt * 4);
      for (const key of Object.keys(current)) current[key] += (target[key] - current[key]) * ease;

      const energy = energyRef?.current ?? 0;
      if (energyRef) energyRef.current = energy * Math.exp(-dt * 3.2);
      phase += dt * current.speed;

      const cx = size / 2;
      const radius = size / 2 - 2;
      context.clearRect(0, 0, size, size);
      context.lineWidth = 0.8;

      for (let line = 0; line < LINE_COUNT; line += 1) {
        const t = line / (LINE_COUNT - 1);
        const base = radius * (1 - current.spread + current.spread * t) * 0.94;
        const amp = radius * (current.amplitude + energy * 0.11 * (0.4 + t));
        const petals = 11;
        const linePhase = phase * (line % 2 ? 1 : -0.7) + t * 2.6;
        context.beginPath();
        for (let s = 0; s <= 300; s += 1) {
          const theta = (s / 300) * TAU;
          const r =
            base +
            amp * Math.sin(petals * theta + linePhase) * 0.6 +
            amp * 0.4 * Math.cos(3 * theta - linePhase * 1.3);
          const x = cx + r * Math.cos(theta);
          const y = cx + r * Math.sin(theta);
          if (s === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();
        const highlight = line === LINE_COUNT - 1 || line === Math.floor(LINE_COUNT / 2);
        context.strokeStyle = highlight ? accent : color;
        context.globalAlpha = current.alpha * (highlight ? 0.9 : 0.35 + t * 0.5);
        context.stroke();
      }
      context.globalAlpha = 1;

      if (!reduceMotion) frame = requestAnimationFrame(draw);
    }

    redrawRef.current = reduceMotion ? () => draw(performance.now()) : null;
    resize();
    const observer = new ResizeObserver(() => {
      resize();
      if (reduceMotion) draw(performance.now());
    });
    observer.observe(canvas);
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [energyRef, color, accent]);

  // Con movimiento reducido se redibuja una vez por cambio de estado.
  useEffect(() => {
    redrawRef.current?.();
  }, [mood]);

  return <canvas ref={canvasRef} className="live-rosette" aria-hidden="true" />;
}
