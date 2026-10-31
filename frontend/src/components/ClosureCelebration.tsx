import { useEffect, useState } from 'react';
import useReducedMotion from '../hooks/useReducedMotion';

const CHECK_LENGTH = 50;

export default function ClosureCelebration({ onDone }: { onDone: () => void }) {
  const reducedMotion = useReducedMotion();
  const [drawn, setDrawn] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) return;
    const raf = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  useEffect(() => {
    const timer = setTimeout(onDone, reducedMotion ? 1000 : 1800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(22,33,27,0.45)' }}
      onClick={onDone}
    >
      <div className="celebration-in bg-panel rounded-card px-10 py-9 flex flex-col items-center gap-4 shadow-xl">
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r="32" fill="rgba(62,138,76,0.1)" stroke="#3E8A4C" strokeWidth="2.5" />
          <path
            d="M20 37 L31 48 L52 24"
            fill="none"
            stroke="#3E8A4C"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={CHECK_LENGTH}
            strokeDashoffset={drawn ? 0 : CHECK_LENGTH}
            style={reducedMotion ? undefined : { transition: 'stroke-dashoffset 600ms ease-out' }}
          />
        </svg>
        <p className="font-serif text-[17px] font-semibold text-text-primary">Dossier cloture</p>
      </div>
    </div>
  );
}
