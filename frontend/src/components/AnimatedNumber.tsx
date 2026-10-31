import { useEffect, useRef, useState } from 'react';
import useOnScreen from '../hooks/useOnScreen';
import useReducedMotion from '../hooks/useReducedMotion';

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function AnimatedNumber({
  value,
  format,
  duration = 900,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  const fmt = format ?? ((n: number) => n.toLocaleString('fr-TN'));
  const [ref, isVisible] = useOnScreen<HTMLSpanElement>();
  const reducedMotion = useReducedMotion();
  // Number(...) : les champs Decimal du backend (montants) sont serialises en
  // JSON comme des chaines (Pydantic prevserve la precision) - le type
  // TypeScript declare `number` mais la valeur reelle peut etre une string a
  // l'execution ; sans coercion, la derniere frame (setDisplay(value)) et le
  // mode reduced-motion afficheraient la chaine brute non formatee.
  const numericValue = Number(value);
  const [display, setDisplay] = useState(reducedMotion ? numericValue : 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(numericValue);
      return;
    }
    if (!isVisible) return;

    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setDisplay(from + (numericValue - from) * easeOutCubic(t));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(numericValue);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, numericValue, duration, reducedMotion]);

  return <span ref={ref}>{fmt(display)}</span>;
}
