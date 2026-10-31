import { useEffect, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Layout from '../components/Layout';
import useReducedMotion from '../hooks/useReducedMotion';
import { fetchPrevisions, type PrevisionsResponse, type SeriePrevision } from '../services/previsionsService';

function formatMontantCourt(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('fr-TN', { maximumFractionDigits: 2 })} M`;
  if (v >= 1_000) return `${(v / 1_000).toLocaleString('fr-TN', { maximumFractionDigits: 1 })} K`;
  return v.toLocaleString('fr-TN', { maximumFractionDigits: 0 });
}

function dotColor(type: string): string {
  if (type === 'prevision') return '#8DC63F';
  if (type === 'backtest') return '#3E8A4C';
  return '#16211B';
}

function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const r = payload.type === 'prevision' ? 5 : 3;
  return <circle cx={cx} cy={cy} r={r} fill={dotColor(payload.type)} stroke="#FFFFFF" strokeWidth={1} />;
}

function SerieChart({ serie, unite, valueFormatter }: { serie: SeriePrevision; unite: string; valueFormatter: (v: number) => string }) {
  const reducedMotion = useReducedMotion();
  const data = serie.points.map((p) => ({
    ...p,
    intervalle: p.borneBasse !== null && p.borneHaute !== null ? [p.borneBasse, p.borneHaute] : undefined,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(18,38,26,0.07)" vertical={false} />
          <XAxis dataKey="mois" tick={{ fontSize: 10.5, fill: '#5C6B60' }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={valueFormatter}
            tick={{ fontSize: 10.5, fill: '#5C6B60' }}
            axisLine={false}
            tickLine={false}
            width={54}
          />
          <Tooltip
            formatter={(value: any, name: string) => {
              if (name === 'intervalle' && Array.isArray(value)) {
                return [`${valueFormatter(value[0])} - ${valueFormatter(value[1])} ${unite}`, 'Intervalle (80%)'];
              }
              return [`${valueFormatter(value as number)} ${unite}`, 'Valeur'];
            }}
            contentStyle={{ background: '#FFFFFF', border: '1px solid rgba(18,38,26,0.07)', borderRadius: 9, fontSize: 12 }}
            labelStyle={{ color: '#16211B' }}
          />
          <Area
            dataKey="intervalle"
            stroke="none"
            fill="#3E8A4C"
            fillOpacity={0.15}
            connectNulls
            isAnimationActive={!reducedMotion}
            animationDuration={800}
            animationEasing="ease-out"
          />
          <Line
            dataKey="valeur"
            stroke="#3E8A4C"
            strokeWidth={2}
            dot={<CustomDot />}
            connectNulls
            isAnimationActive={!reducedMotion}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2 text-[11px] text-text-faint font-sans">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: '#16211B' }} /> Historique
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: '#3E8A4C' }} /> Backtest
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: '#8DC63F' }} /> Prevision
        </span>
        <span className="ml-auto font-mono">
          {serie.modele} · MAPE backtest {serie.mapeBacktest !== null ? `${serie.mapeBacktest}%` : '-'} ·{' '}
          {serie.nombreMoisHistorique} mois d&apos;historique
        </span>
      </div>
    </div>
  );
}

function InstabiliteWarning({ serie }: { serie: SeriePrevision }) {
  if (!serie.instable || !serie.messageInstabilite) return null;
  return (
    <div
      className="text-[12.5px] text-brand-bright rounded-control px-3 py-2 mb-3 font-sans"
      style={{ background: 'rgba(141,198,63,0.1)', border: '1px solid rgba(141,198,63,0.25)' }}
    >
      ⚠ {serie.messageInstabilite}
    </div>
  );
}

export default function PrevisionsPage() {
  const [data, setData] = useState<PrevisionsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPrevisions().then(setData).catch(() => setError('Impossible de charger les previsions.'));
  }, []);

  return (
    <Layout>
      <div className="max-w-content mx-auto px-9 py-7">
        <div className="mb-6">
          <h2 className="font-serif text-[25px] font-semibold text-text-primary tracking-tight">Previsions</h2>
          <p className="text-text-muted text-[13px] mt-1 font-sans">
            ARIMA, backtest sur les 4 derniers mois, prevision du mois suivant avec intervalle de confiance a 80%.
          </p>
        </div>

        {error && (
          <p className="text-sm text-danger bg-status-critique-bg border border-danger/20 rounded-control px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {!data && !error && <p className="text-text-muted font-sans">Chargement (entrainement ARIMA en cours)...</p>}

        {data && (
          <>
            <div className="bg-panel border border-hairline rounded-card p-5 mb-5">
              <h4 className="font-serif text-sm font-semibold text-text-primary mb-3">Nombre de sinistres par mois</h4>
              <InstabiliteWarning serie={data.nombreSinistres} />
              <SerieChart serie={data.nombreSinistres} unite="dossiers" valueFormatter={(v) => v.toFixed(0)} />
            </div>

            <div className="bg-panel border border-hairline rounded-card p-5">
              <h4 className="font-serif text-sm font-semibold text-text-primary mb-3">Montant total regle par mois</h4>
              <InstabiliteWarning serie={data.montantTotal} />
              <SerieChart serie={data.montantTotal} unite="DT" valueFormatter={formatMontantCourt} />
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
