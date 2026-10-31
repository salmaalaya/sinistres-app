import { useEffect, useState } from 'react';
import ArcGauge from './ArcGauge';
import { fetchHealthScore, type HealthScoreResponse } from '../services/dashboardService';

function colorForScore(pct: number): { stroke: string; glow: string } {
  const score = pct * 100;
  if (score < 40) return { stroke: '#C85A42', glow: 'rgba(226,112,90,0.35)' };
  if (score < 70) return { stroke: '#D9A441', glow: 'rgba(217,164,65,0.35)' };
  return { stroke: '#3E8A4C', glow: 'rgba(141,198,63,0.35)' };
}

const COMPOSANTES_LABELS: Record<keyof HealthScoreResponse['composantes'], string> = {
  cloture: 'Cloture',
  delais: 'Delais',
  anomalies: 'Anomalies',
  critiques: 'Dossiers critiques',
};

export default function HealthScoreGauge() {
  const [data, setData] = useState<HealthScoreResponse | null>(null);

  useEffect(() => {
    fetchHealthScore().then(setData).catch(() => setData(null));
  }, []);

  if (!data) return null;

  return (
    <div className="bg-panel border border-hairline rounded-card p-5 mb-6 flex items-center gap-6 flex-wrap">
      <div className="w-[160px] shrink-0">
        <ArcGauge
          value={data.score}
          unit="/100"
          label="Sante du portefeuille"
          maxScale={100}
          colorFor={colorForScore}
        />
      </div>
      <div className="flex-1 min-w-[220px]">
        <h4 className="font-serif text-sm font-semibold text-text-primary mb-2">Composantes du score</h4>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px] font-sans">
          {(Object.keys(data.composantes) as Array<keyof HealthScoreResponse['composantes']>).map((key) => (
            <div key={key} className="flex justify-between">
              <span className="text-text-muted">{COMPOSANTES_LABELS[key]}</span>
              <span className="font-mono text-text-primary">
                {data.composantes[key].toLocaleString('fr-TN', { maximumFractionDigits: 1 })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
