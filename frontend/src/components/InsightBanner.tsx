import { useEffect, useState } from 'react';
import { fetchInsight } from '../services/dashboardService';

export default function InsightBanner() {
  const [texte, setTexte] = useState<string | null>(null);

  useEffect(() => {
    fetchInsight()
      .then((r) => setTexte(r.texte))
      .catch(() => setTexte(null));
  }, []);

  if (!texte) return null;

  return (
    <div
      className="flex items-center gap-2.5 rounded-control px-4 py-2.5 mb-5 text-[12.5px] font-sans"
      style={{ background: 'rgba(62,138,76,0.08)', border: '1px solid rgba(62,138,76,0.18)' }}
    >
      <span className="text-brand-bright text-[15px] leading-none shrink-0">&#10022;</span>
      <span className="italic text-text-primary">{texte}</span>
    </div>
  );
}
