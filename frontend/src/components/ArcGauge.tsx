import { useEffect, useRef, useState } from 'react';
import useOnScreen from '../hooks/useOnScreen';
import useReducedMotion from '../hooks/useReducedMotion';

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const ARC_LENGTH = Math.PI * 70; // demi-circonference du chemin M 20 100 A 70 70 0 1 1 160 100

interface ArcGaugeProps {
  value: number | null;
  unit: string;
  label: string;
  maxScale: number;
  thresholdValue?: number;
  thresholdLabel?: string;
  /** Override de la couleur du remplissage a partir du pourcentage (0-1).
   * Par defaut : logique 2 couleurs basee sur thresholdValue (jauges de delai). */
  colorFor?: (pct: number) => { stroke: string; glow: string };
}

function pointOnArc(pct: number, radius: number) {
  const theta = 180 * (1 - pct); // 0 -> 180deg (gauche), 1 -> 0deg (droite)
  const rad = (theta * Math.PI) / 180;
  return { x: 90 + radius * Math.cos(rad), y: 100 - radius * Math.sin(rad) };
}

export default function ArcGauge({ value, unit, label, maxScale, thresholdValue, thresholdLabel, colorFor }: ArcGaugeProps) {
  const [ref, isVisible] = useOnScreen<SVGSVGElement>();
  const reducedMotion = useReducedMotion();

  const pct = value === null ? 0 : Math.min(Math.max(value / maxScale, 0), 1);
  const drawn = reducedMotion || isVisible;
  const dashoffset = drawn ? ARC_LENGTH * (1 - pct) : ARC_LENGTH;

  const isCritical = thresholdValue !== undefined && value !== null && value > thresholdValue;
  const defaultColors = { stroke: isCritical ? '#C85A42' : '#3E8A4C', glow: isCritical ? 'rgba(226,112,90,0.35)' : 'rgba(141,198,63,0.35)' };
  const { stroke: strokeColor, glow } = colorFor ? colorFor(pct) : defaultColors;

  const thresholdPct = thresholdValue !== undefined ? Math.min(thresholdValue / maxScale, 1) : null;
  const tickInner = thresholdPct !== null ? pointOnArc(thresholdPct, 58) : null;
  const tickOuter = thresholdPct !== null ? pointOnArc(thresholdPct, 82) : null;

  const [displayValue, setDisplayValue] = useState(reducedMotion || value === null ? value : 0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (value === null) {
      setDisplayValue(null);
      return;
    }
    if (reducedMotion) {
      setDisplayValue(value);
      return;
    }
    if (!drawn) return;

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / 700, 1);
      setDisplayValue(value * easeOutCubic(t));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else setDisplayValue(value);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawn, value, reducedMotion]);

  return (
    <div className="bg-panel border border-hairline rounded-card px-3.5 pt-4 pb-3 text-center">
      <svg
        ref={ref}
        viewBox="0 0 180 118"
        className="w-full max-w-[160px] mx-auto"
        style={{ filter: `drop-shadow(0 0 8px ${glow})` }}
      >
        <path
          d="M 20 100 A 70 70 0 1 1 160 100"
          fill="none"
          stroke="rgba(18,38,26,0.08)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 20 100 A 70 70 0 1 1 160 100"
          fill="none"
          stroke={strokeColor}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={ARC_LENGTH}
          strokeDashoffset={dashoffset}
          style={reducedMotion ? undefined : { transition: 'stroke-dashoffset 700ms ease-out' }}
        />
        {tickInner && tickOuter && (
          <line
            x1={tickInner.x}
            y1={tickInner.y}
            x2={tickOuter.x}
            y2={tickOuter.y}
            stroke="#C85A42"
            strokeWidth="2.5"
          />
        )}
        <text x="90" y="92" textAnchor="middle" style={{ fontFamily: 'Fraunces, serif', fontSize: 21, fontWeight: 600, fill: '#16211B' }}>
          {displayValue !== null ? displayValue.toFixed(1).replace('.', ',') : '-'}
          <tspan style={{ fontFamily: 'Inter, sans-serif', fontSize: 10.5, fontWeight: 500, fill: '#5C6B60' }}> {unit}</tspan>
        </text>
      </svg>
      <div className="text-[11px] text-text-muted mt-0.5 leading-tight font-sans min-h-[28px]">{label}</div>
      {thresholdLabel && (
        <div className="text-[9.5px] text-brand-bright mt-1.5 font-semibold tracking-wide font-sans">
          {thresholdLabel}
        </div>
      )}
    </div>
  );
}
