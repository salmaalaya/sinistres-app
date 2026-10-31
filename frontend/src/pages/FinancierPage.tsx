import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Layout from '../components/Layout';
import useOnScreen from '../hooks/useOnScreen';
import useReducedMotion from '../hooks/useReducedMotion';
import {
  exportFinancierPdf,
  fetchDashboardFinancier,
  type DashboardFinancier,
  type MontantRepartitionItem,
} from '../services/financierService';
import { triggerPdfDownload } from '../utils/downloadPdf';

const CATEGORICAL_COLORS = ['#16211B', '#3E8A4C', '#2E8A8F'];

function formatMontant(v: number): string {
  return v.toLocaleString('fr-TN', { minimumFractionDigits: 3 });
}

function formatMontantCourt(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('fr-TN', { maximumFractionDigits: 2 })} M`;
  if (v >= 1_000) return `${(v / 1_000).toLocaleString('fr-TN', { maximumFractionDigits: 1 })} K`;
  return v.toLocaleString('fr-TN', { maximumFractionDigits: 0 });
}

function RepartitionBars({ data, title }: { data: MontantRepartitionItem[]; title: string }) {
  const [ref, isVisible] = useOnScreen<HTMLDivElement>();
  const reducedMotion = useReducedMotion();
  const drawn = reducedMotion || isVisible;

  // Number(...) : montant est serialise en JSON comme une chaine par Pydantic
  // (Decimal -> string, pour preserver la precision) ; `+` ferait une
  // concatenation de chaines au lieu d'une somme sans cette coercion explicite.
  const total = data.reduce((s, d) => s + Number(d.montant), 0) || 1;
  return (
    <div ref={ref} className="bg-panel border border-hairline rounded-card p-5 flex-1">
      <h4 className="font-serif text-sm font-semibold text-text-primary mb-4">{title}</h4>
      {data.map((d, i) => (
        <div key={d.label} className="mb-3">
          <div className="flex justify-between text-xs mb-1.5 font-sans">
            <span className="font-medium text-text-primary">{d.label}</span>
            <span className="font-mono text-text-muted">{formatMontantCourt(d.montant)} DT</span>
          </div>
          <div className="h-1.5 rounded-full bg-hairline overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: drawn ? `${(Number(d.montant) / total) * 100}%` : '0%',
                background: CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length],
                boxShadow: '0 0 8px rgba(141,198,63,0.3)',
                transition: reducedMotion ? undefined : `width 600ms ease-out ${i * 80}ms`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FinancierPage() {
  const [data, setData] = useState<DashboardFinancier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    fetchDashboardFinancier().then(setData).catch(() => setError('Impossible de charger les donnees financieres.'));
  }, []);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const blob = await exportFinancierPdf();
      triggerPdfDownload(blob, 'financier.pdf');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-content mx-auto px-9 py-7">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-serif text-[25px] font-semibold text-text-primary tracking-tight">Financier</h2>
            <p className="text-text-muted text-[13px] mt-1 font-sans">
              Evolution des montants regles, repartition et plus gros reglements.
            </p>
          </div>
          {data && (
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exporting}
              className="text-sm font-semibold text-brand-bright border border-hairline rounded-control px-4 py-2 disabled:opacity-60 transition-colors hover:border-brand-bright shrink-0"
            >
              {exporting ? 'Export en cours...' : 'Exporter le rapport'}
            </button>
          )}
        </div>

        {error && (
          <p className="text-sm text-danger bg-status-critique-bg border border-danger/20 rounded-control px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {!data && !error && <p className="text-text-muted font-sans">Chargement...</p>}

        {data && (
          <>
            <div className="bg-panel border border-hairline rounded-card p-5 mb-5">
              <h4 className="font-serif text-sm font-semibold text-text-primary mb-4">Evolution mensuelle des montants regles</h4>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.evolutionMensuelle} margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
                  <defs>
                    <linearGradient id="brandFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3E8A4C" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3E8A4C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(18,38,26,0.07)" vertical={false} />
                  <XAxis dataKey="mois" tick={{ fontSize: 10.5, fill: '#5C6B60' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => formatMontantCourt(v)}
                    tick={{ fontSize: 10.5, fill: '#5C6B60' }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${formatMontant(v)} DT`, 'Montant']}
                    contentStyle={{ background: '#FFFFFF', border: '1px solid rgba(18,38,26,0.07)', borderRadius: 9, fontSize: 12 }}
                    labelStyle={{ color: '#16211B' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="montantTotal"
                    stroke="#3E8A4C"
                    strokeWidth={2}
                    fill="url(#brandFill)"
                    isAnimationActive={!reducedMotion}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <RepartitionBars data={data.repartitionMontantNature} title="Montant regle par Nature" />
              <RepartitionBars data={data.repartitionMontantProcessus} title="Montant regle par Processus" />
            </div>

            <h3 className="font-serif text-base font-semibold text-text-primary mb-3.5">Top 10 des plus gros reglements</h3>
            <div className="bg-panel border border-hairline rounded-card overflow-hidden">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="border-b border-hairline">
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">Code</th>
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">N Sinistre</th>
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">Date reglement</th>
                    <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">Montant</th>
                    <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topReglements.map((r, i) => (
                    <tr key={i} className={i < data.topReglements.length - 1 ? 'border-b border-hairline' : ''}>
                      <td className="px-4 py-2.5 font-mono text-text-muted text-[11px]">{r.codeSinistre}</td>
                      <td className="px-4 py-2.5">{r.nSinistre}</td>
                      <td className="px-4 py-2.5">{r.dateReglement}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-brand-bright font-semibold">
                        {formatMontant(r.montant)} DT
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link to={`/sinistres/${r.sinistreId}`} className="text-[12px] text-brand-bright hover:underline">
                          Voir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
