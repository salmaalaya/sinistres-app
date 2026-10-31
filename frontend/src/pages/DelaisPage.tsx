import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import ArcGauge from '../components/ArcGauge';
import AnimatedNumber from '../components/AnimatedNumber';
import useOnScreen from '../hooks/useOnScreen';
import useReducedMotion from '../hooks/useReducedMotion';
import {
  exportDelaisPdf,
  fetchClassementGestionnaires,
  fetchDelaisStats,
  fetchDossiersDelais,
  fetchHistogrammeCloture,
  type DelaiStat,
  type DelaisStats,
  type GestionnaireScore,
  type SinistreDelai,
  type SinistresDelaisPage,
  type TrancheHistogramme,
} from '../services/delaisService';
import { triggerPdfDownload } from '../utils/downloadPdf';

const PAGE_SIZE = 15;

const SORT_OPTIONS = [
  { value: 'ouvertureCloture', label: 'Ouverture -> Cloture' },
  { value: 'sinistreOuverture', label: 'Sinistre -> Ouverture' },
  { value: 'ouvertureOrdonnancement', label: 'Ouverture -> Ordonnancement' },
  { value: 'ordonnancementReglement', label: 'Ordonnancement -> Reglement' },
];

function fmt(v: number | null): string {
  return v === null ? '-' : v.toLocaleString('fr-TN', { maximumFractionDigits: 1 }).replace('.', ',');
}

function fmtNum(v: number): string {
  return v.toLocaleString('fr-TN', { maximumFractionDigits: 1 }).replace('.', ',');
}

function DelaiBlock({
  title,
  stat,
  maxScale,
  thresholdValue,
}: {
  title: string;
  stat: DelaiStat;
  maxScale: number;
  thresholdValue?: number;
}) {
  return (
    <div>
      <ArcGauge
        value={stat.moyenne}
        unit="j"
        label={title}
        maxScale={maxScale}
        thresholdValue={thresholdValue}
        thresholdLabel={thresholdValue !== undefined ? `Seuil critique : ${thresholdValue} j` : undefined}
      />
      <div className="flex justify-around mt-2.5 text-center font-sans">
        <div>
          <div className="font-mono text-[13px] text-text-primary">
            {stat.mediane === null ? '-' : <AnimatedNumber value={stat.mediane} format={fmtNum} />}
          </div>
          <div className="text-[9.5px] uppercase tracking-wide text-text-faint mt-0.5">Mediane</div>
        </div>
        <div>
          <div className="font-mono text-[13px] text-text-primary">
            {stat.minimum === null ? '-' : <AnimatedNumber value={stat.minimum} format={fmtNum} />}
          </div>
          <div className="text-[9.5px] uppercase tracking-wide text-text-faint mt-0.5">Min</div>
        </div>
        <div>
          <div className="font-mono text-[13px] text-text-primary">
            {stat.maximum === null ? '-' : <AnimatedNumber value={stat.maximum} format={fmtNum} />}
          </div>
          <div className="text-[9.5px] uppercase tracking-wide text-text-faint mt-0.5">Max</div>
        </div>
      </div>
    </div>
  );
}

function HistogrammeCloture({ data }: { data: TrancheHistogramme[] }) {
  const [ref, isVisible] = useOnScreen<HTMLDivElement>();
  const reducedMotion = useReducedMotion();
  const drawn = reducedMotion || isVisible;

  const max = Math.max(...data.map((d) => d.nombreDossiers), 1);
  return (
    <div className="bg-panel border border-hairline rounded-card p-5">
      <h4 className="font-serif text-sm font-semibold text-text-primary mb-4">
        Distribution du delai de cloture (Ouverture -&gt; Cloture)
      </h4>
      <div ref={ref} className="flex items-end gap-3 h-40">
        {data.map((d, i) => (
          <div key={d.tranche} className="flex-1 flex flex-col items-center justify-end h-full">
            <span className="text-[11px] font-mono text-text-primary mb-1.5">{d.nombreDossiers}</span>
            <div
              className="w-full rounded-t shrink-0"
              style={{
                height: drawn ? `${(d.nombreDossiers / max) * 100}%` : '0%',
                minHeight: drawn ? 2 : 0,
                background: 'linear-gradient(180deg, #8DC63F, #3E8A4C)',
                transition: reducedMotion ? undefined : `height 600ms ease-out ${i * 80}ms`,
              }}
            />
            <span className="text-[10px] text-text-faint mt-2 font-sans">{d.tranche}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopLents({ data }: { data: SinistreDelai[] }) {
  return (
    <div className="bg-panel border border-hairline rounded-card p-5">
      <h4 className="font-serif text-sm font-semibold text-text-primary mb-4">Top 5 des dossiers les plus lents</h4>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.id} className="flex items-center justify-between pl-3 py-1.5" style={{ borderLeft: '3px solid #C85A42' }}>
            <div className="flex items-center gap-2.5 pl-2">
              <span className="font-mono text-[11px] text-text-muted">{d.codeSinistre}</span>
              <span className="text-[12.5px] text-text-primary">{d.nSinistre}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[12.5px] text-danger font-semibold">{fmt(d.ouvertureClotureJours)}j</span>
              <Link to={`/sinistres/${d.id}`} className="text-[11.5px] text-brand-bright hover:underline">
                Voir
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClassementGestionnaires({ data }: { data: GestionnaireScore[] }) {
  return (
    <div className="bg-panel border border-hairline rounded-card p-5">
      <h4 className="font-serif text-sm font-semibold text-text-primary mb-4">Classement des gestionnaires</h4>
      {data.length === 0 ? (
        <p className="text-[12.5px] text-text-muted font-sans">
          Aucun dossier n&apos;a de gestionnaire assigne pour le moment — le formulaire de gestion des sinistres ne
          gere pas encore cette affectation. Ce classement s&apos;alimentera automatiquement des que des dossiers
          seront assignes.
        </p>
      ) : (
        <div className="space-y-2">
          {data.map((g, i) => (
            <div key={g.gestionnaireId} className="flex items-center justify-between text-[12.5px] font-sans">
              <span className="text-text-primary">
                {i + 1}. {g.nomComplet}{' '}
                <span className="text-text-faint">({g.nombreDossiers} dossiers)</span>
              </span>
              <span className="font-mono text-brand-bright">{g.scoreMoyen}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DelaisPage() {
  const [stats, setStats] = useState<DelaisStats | null>(null);
  const [dossiersPage, setDossiersPage] = useState<SinistresDelaisPage | null>(null);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState('ouvertureCloture');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [histogramme, setHistogramme] = useState<TrancheHistogramme[] | null>(null);
  const [topLents, setTopLents] = useState<SinistreDelai[]>([]);
  const [gestionnaires, setGestionnaires] = useState<GestionnaireScore[]>([]);
  const [exporting, setExporting] = useState(false);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const blob = await exportDelaisPdf();
      triggerPdfDownload(blob, 'delais_performance.pdf');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    fetchDelaisStats()
      .then(setStats)
      .catch(() => setError('Impossible de charger les statistiques de delais.'));
    fetchHistogrammeCloture().then(setHistogramme).catch(() => {});
    fetchDossiersDelais(0, 5, 'ouvertureCloture').then((p) => setTopLents(p.content)).catch(() => {});
    fetchClassementGestionnaires().then(setGestionnaires).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchDossiersDelais(page, PAGE_SIZE, sortBy)
      .then(setDossiersPage)
      .catch(() => setError('Impossible de charger les dossiers.'))
      .finally(() => setLoading(false));
  }, [page, sortBy]);

  return (
    <Layout>
      <div className="max-w-content mx-auto px-9 py-7">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-serif text-[25px] font-semibold text-text-primary tracking-tight">Delais &amp; Performance</h2>
            <p className="text-text-muted text-[13px] mt-1 font-sans">
              Moyenne, mediane, minimum et maximum pour les 4 delais du parcours d&apos;un dossier.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exporting}
            className="text-sm font-semibold text-brand-bright border border-hairline rounded-control px-4 py-2 disabled:opacity-60 transition-colors hover:border-brand-bright shrink-0"
          >
            {exporting ? 'Export en cours...' : 'Exporter le rapport'}
          </button>
        </div>

        {error && (
          <p className="text-sm text-danger bg-status-critique-bg border border-danger/20 rounded-control px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
            <DelaiBlock title="Sinistre -> Ouverture" stat={stats.sinistreOuverture} maxScale={30} />
            <DelaiBlock title="Ouverture -> Ordonnancement" stat={stats.ouvertureOrdonnancement} maxScale={150} />
            <DelaiBlock title="Ordonnancement -> Reglement" stat={stats.ordonnancementReglement} maxScale={60} />
            <DelaiBlock
              title="Ouverture -> Cloture"
              stat={stats.ouvertureCloture}
              maxScale={180}
              thresholdValue={stats.seuilCritiqueClotureJours}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-6">
          {histogramme && <HistogrammeCloture data={histogramme} />}
          {topLents.length > 0 && <TopLents data={topLents} />}
        </div>

        <div className="mb-6">
          <ClassementGestionnaires data={gestionnaires} />
        </div>

        <div className="flex items-center justify-between mb-3.5">
          <h3 className="font-serif text-base font-semibold text-text-primary">Delais par dossier</h3>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-text-muted font-sans" htmlFor="sortBy">
              Trier par
            </label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(0);
              }}
              className="text-sm border border-hairline rounded-control px-2.5 py-1.5 bg-black/[0.03] text-text-primary focus:outline-none focus:border-brand"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-panel rounded-card border border-hairline overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-hairline">
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">
                  Code
                </th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">
                  N Sinistre
                </th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">
                  Statut
                </th>
                <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">
                  Sin. -&gt; Ouv.
                </th>
                <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">
                  Ouv. -&gt; Ord.
                </th>
                <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">
                  Ord. -&gt; Regl.
                </th>
                <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">
                  Ouv. -&gt; Clot.
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center text-text-muted py-10 font-sans">
                    Chargement...
                  </td>
                </tr>
              )}
              {!loading &&
                dossiersPage?.content.map((d, i) => (
                  <tr
                    key={d.id}
                    className={`hover:bg-black/[0.02] transition-colors ${
                      i < (dossiersPage?.content.length ?? 0) - 1 ? 'border-b border-hairline' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono text-text-muted text-[11px]">{d.codeSinistre}</td>
                    <td className="px-4 py-2.5">{d.nSinistre}</td>
                    <td className="px-4 py-2.5">
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
                    <td className="px-4 py-2.5 text-right font-mono">{fmt(d.sinistreOuvertureJours)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{fmt(d.ouvertureOrdonnancementJours)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{fmt(d.ordonnancementReglementJours)}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{fmt(d.ouvertureClotureJours)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {dossiersPage && dossiersPage.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-text-muted font-sans">
            <span>
              Page {dossiersPage.number + 1} / {dossiersPage.totalPages}
            </span>
            <div className="space-x-2">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 border border-hairline rounded-control disabled:opacity-40 hover:text-brand-bright transition-colors"
              >
                Precedent
              </button>
              <button
                disabled={dossiersPage.number + 1 >= dossiersPage.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border border-hairline rounded-control disabled:opacity-40 hover:text-brand-bright transition-colors"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
