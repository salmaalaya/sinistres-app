import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import ArcGauge from '../components/ArcGauge';
import AnimatedNumber from '../components/AnimatedNumber';
import HealthScoreGauge from '../components/HealthScoreGauge';
import InsightBanner from '../components/InsightBanner';
import useOnScreen from '../hooks/useOnScreen';
import useReducedMotion from '../hooks/useReducedMotion';
import { exportDashboardPdf, fetchDashboardKpis, type DashboardKpis, type RepartitionItem } from '../services/dashboardService';
import { triggerPdfDownload } from '../utils/downloadPdf';

const CATEGORICAL_COLORS = ['#16211B', '#3E8A4C', '#2E8A8F'];
const DONUT_RADIUS = 15.9155;
const DONUT_CIRC = 2 * Math.PI * DONUT_RADIUS;

function formatMontant(value: number): string {
  return value.toLocaleString('fr-TN', { minimumFractionDigits: 3 });
}

function formatMontantCourt(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('fr-TN', { maximumFractionDigits: 2 })} M`;
  if (value >= 1_000) return `${(value / 1_000).toLocaleString('fr-TN', { maximumFractionDigits: 1 })} K`;
  return value.toLocaleString('fr-TN', { maximumFractionDigits: 0 });
}

function Kpi({
  label,
  value,
  delta,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  tone?: 'neutral' | 'danger';
}) {
  return (
    <div className="flex-1 min-w-[150px] px-5 py-4">
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      <p className="font-serif text-[27px] font-semibold text-text-primary mt-2.5 leading-none tracking-tight">{value}</p>
      {delta && (
        <p className={`text-[11px] mt-2 font-sans ${tone === 'danger' ? 'text-danger' : 'text-text-faint'}`}>
          {delta}
        </p>
      )}
    </div>
  );
}

function KpiRow({ children }: { children: ReactNode }) {
  return (
    <div className="bg-panel rounded-card border border-hairline flex flex-wrap divide-x divide-hairline mb-6">
      {children}
    </div>
  );
}

function SectionHead({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-baseline justify-between mt-8 mb-3.5">
      <h3 className="font-serif text-base font-semibold text-text-primary">{title}</h3>
      <span className="text-[11.5px] text-text-faint font-sans">{hint}</span>
    </div>
  );
}

function Donut({ data }: { data: RepartitionItem[] }) {
  const [ref, isVisible] = useOnScreen<SVGSVGElement>();
  const reducedMotion = useReducedMotion();
  const drawn = reducedMotion || isVisible;

  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  let cumulativePct = 0;
  const segments = data.map((d, i) => {
    const pct = (d.value / total) * 100;
    const segment = {
      color: CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length],
      dasharray: drawn ? `${(pct / 100) * DONUT_CIRC} ${DONUT_CIRC}` : `0 ${DONUT_CIRC}`,
      dashoffset: DONUT_CIRC * 0.25 - (cumulativePct / 100) * DONUT_CIRC,
      pct,
    };
    cumulativePct += pct;
    return segment;
  });

  return (
    <div className="flex gap-4 items-center mb-4">
      <svg
        ref={ref}
        width="82"
        height="82"
        viewBox="0 0 42 42"
        style={{ filter: 'drop-shadow(0 0 6px rgba(141,198,63,0.2))' }}
      >
        <circle cx="21" cy="21" r={DONUT_RADIUS} fill="transparent" stroke="rgba(18,38,26,0.08)" strokeWidth="6" />
        {segments.map((s, i) => (
          <circle
            key={i}
            cx="21"
            cy="21"
            r={DONUT_RADIUS}
            fill="transparent"
            stroke={s.color}
            strokeWidth="6"
            strokeDasharray={s.dasharray}
            strokeDashoffset={s.dashoffset}
            style={reducedMotion ? undefined : { transition: `stroke-dasharray 500ms ease-out ${i * 130}ms` }}
          />
        ))}
      </svg>
      <div className="flex-1 text-xs font-sans">
        <div className="text-[10.5px] text-text-faint font-semibold uppercase tracking-wide mb-1.5">Nature</div>
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center justify-between py-1">
            <span className="flex items-center gap-1.5 text-text-primary">
              <span
                className="w-2 h-2 rounded-[2px] shrink-0"
                style={{ background: CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length] }}
              />
              {d.label}
            </span>
            <span className="font-mono text-text-muted text-[11px]">
              {((d.value / total) * 100).toLocaleString('fr-TN', { maximumFractionDigits: 1 })}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProcessusBars({ data }: { data: RepartitionItem[] }) {
  const [ref, isVisible] = useOnScreen<HTMLDivElement>();
  const reducedMotion = useReducedMotion();
  const drawn = reducedMotion || isVisible;

  const max = Math.max(...data.map((d) => d.value), 1);
  const gradients = [
    'linear-gradient(90deg,#3E8A4C,#8DC63F)',
    'linear-gradient(90deg,#2E8A8F,#48C7AC)',
  ];
  return (
    <div ref={ref}>
      {data.map((d, i) => (
        <div key={d.label} className="mb-3">
          <div className="flex justify-between text-xs mb-1.5 font-sans">
            <span className="font-medium text-text-primary">{d.label}</span>
            <span className="font-mono text-text-muted">{d.value.toLocaleString('fr-TN')}</span>
          </div>
          <div className="h-1.5 rounded-full bg-hairline overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: drawn ? `${(d.value / max) * 100}%` : '0%',
                background: gradients[i % gradients.length],
                boxShadow: '0 0 8px rgba(141,198,63,0.35)',
                transition: reducedMotion ? undefined : `width 600ms ease-out ${i * 80}ms`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchDashboardKpis()
      .then(setKpis)
      .catch(() => setError('Impossible de charger le tableau de bord.'));
  }, []);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const blob = await exportDashboardPdf();
      triggerPdfDownload(blob, 'tableau_de_bord.pdf');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-content mx-auto px-9 py-7">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-serif text-[25px] font-semibold text-text-primary tracking-tight">Tableau de bord</h2>
            <p className="text-text-muted text-[13px] mt-1 font-sans">
              Vue d&apos;ensemble du portefeuille sinistres, calculee depuis la base en temps reel.
            </p>
          </div>
          {kpis && (
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

        {!kpis && !error && <p className="text-text-muted font-sans">Chargement...</p>}

        {kpis && (
          <>
            <InsightBanner />

            <HealthScoreGauge />

            <KpiRow>
              <Kpi label="Total dossiers" value={<AnimatedNumber value={kpis.totalSinistres} />} delta="sinistres uniques" />
              <Kpi
                label="Taux de cloture"
                value={<AnimatedNumber value={kpis.pctCloture} format={(n) => `${n.toLocaleString('fr-TN', { maximumFractionDigits: 1 })}%`} />}
                delta={`${kpis.dossiersClotures.toLocaleString('fr-TN')} clotures`}
              />
              <Kpi
                label="Dossiers ouverts"
                value={<AnimatedNumber value={kpis.dossiersOuverts} />}
                delta={`dont ${kpis.dossiersCritiques.toLocaleString('fr-TN')} critiques`}
                tone="danger"
              />
              <Kpi
                label="Montant total regle"
                value={<AnimatedNumber value={kpis.montantTotalRegle} format={formatMontantCourt} />}
                delta="DT au total"
              />
              <Kpi
                label="Montant moyen"
                value={<AnimatedNumber value={kpis.montantMoyenRegle} format={formatMontant} />}
                delta="DT / dossier"
              />
              <Kpi label="Dossiers Express" value={<AnimatedNumber value={kpis.nombreDossiersExpress} />} delta="processus express" />
              <Kpi
                label="Anomalies detectees"
                value={<AnimatedNumber value={kpis.nombreAnomalies} />}
                delta="Isolation Forest, 5%"
              />
            </KpiRow>

            <SectionHead title="Analyse des delais" hint="Moyenne observee" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <ArcGauge
                value={kpis.delaisMoyens.sinistreOuvertureJours}
                unit="j"
                label="Sinistre → Ouverture"
                maxScale={30}
              />
              <ArcGauge
                value={kpis.delaisMoyens.ouvertureOrdonnancementJours}
                unit="j"
                label="Ouverture → Ordonnancement"
                maxScale={150}
              />
              <ArcGauge
                value={kpis.delaisMoyens.ordonnancementReglementJours}
                unit="j"
                label="Ordonnancement → Reglement"
                maxScale={60}
              />
              <ArcGauge
                value={kpis.delaisMoyens.ouvertureClotureJours}
                unit="j"
                label="Ouverture → Cloture"
                maxScale={180}
                thresholdValue={kpis.delaisMoyens.seuilCritiqueClotureJours}
                thresholdLabel={`Seuil critique : ${kpis.delaisMoyens.seuilCritiqueClotureJours} j`}
              />
            </div>

            <SectionHead title="Repartition & dossiers recents" hint="Nature, processus" />
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.35fr] gap-3.5 items-start">
              <div className="bg-panel border border-hairline rounded-card p-5">
                <h4 className="font-serif text-sm font-semibold text-text-primary mb-4">Composition du portefeuille</h4>
                <Donut data={kpis.repartitionNature} />
                <ProcessusBars data={kpis.repartitionProcessus} />
              </div>

              <div className="bg-panel border border-hairline rounded-card p-5">
                <h4 className="font-serif text-sm font-semibold text-text-primary mb-4">Dossiers recents</h4>
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="border-b border-hairline">
                      <th className="text-left text-[10px] uppercase tracking-wide text-text-faint font-semibold pb-2.5">Code</th>
                      <th className="text-left text-[10px] uppercase tracking-wide text-text-faint font-semibold pb-2.5">N Sinistre</th>
                      <th className="text-left text-[10px] uppercase tracking-wide text-text-faint font-semibold pb-2.5">Nature</th>
                      <th className="text-left text-[10px] uppercase tracking-wide text-text-faint font-semibold pb-2.5">Ouverture</th>
                      <th className="text-left text-[10px] uppercase tracking-wide text-text-faint font-semibold pb-2.5">Statut</th>
                      <th className="text-right text-[10px] uppercase tracking-wide text-text-faint font-semibold pb-2.5">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpis.dossiersRecents.map((d, i) => (
                      <tr
                        key={d.id}
                        className={i < kpis.dossiersRecents.length - 1 ? 'border-b border-hairline' : ''}
                      >
                        <td className="py-2.5 font-mono text-text-muted text-[11px]">
                          <Link to={`/sinistres/${d.id}`} className="hover:text-brand-bright">
                            {d.codeSinistre}
                          </Link>
                        </td>
                        <td className="py-2.5">{d.nSinistre}</td>
                        <td className="py-2.5">{d.natureSin}</td>
                        <td className="py-2.5">{d.dateOuverture}</td>
                        <td className="py-2.5">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold ${
                              d.statut === 'OUVERT'
                                ? 'bg-status-ouvert-bg text-status-ouvert-text'
                                : 'bg-status-cloture-bg text-success'
                            }`}
                          >
                            {d.statut === 'OUVERT' ? 'Ouvert' : 'Cloture'}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono text-text-primary">
                          {formatMontant(d.montantTotalRegle)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
