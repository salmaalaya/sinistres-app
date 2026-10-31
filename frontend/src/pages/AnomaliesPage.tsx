import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { fetchAnomalies, type AnomaliesPage as AnomaliesPageData } from '../services/anomaliesService';

const PAGE_SIZE = 20;

const CONTAMINATION_OPTIONS = [
  { value: 0.01, label: '1% (les plus extremes)' },
  { value: 0.05, label: '5% (recommande)' },
  { value: 0.1, label: '10% (large)' },
];

export default function AnomaliesPage() {
  const [page, setPage] = useState(0);
  const [contamination, setContamination] = useState(0.05);
  const [data, setData] = useState<AnomaliesPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchAnomalies(page, PAGE_SIZE, contamination)
      .then(setData)
      .catch(() => setError('Impossible de charger les anomalies.'))
      .finally(() => setLoading(false));
  }, [page, contamination]);

  return (
    <Layout>
      <div className="max-w-content mx-auto px-9 py-7">
        <div className="mb-6">
          <h2 className="font-serif text-[25px] font-semibold text-text-primary tracking-tight">Anomalies</h2>
          <p className="text-text-muted text-[13px] mt-1 font-sans">
            Detection automatique par Isolation Forest sur les montants et les delais du portefeuille.
          </p>
        </div>

        <div className="bg-panel border border-hairline rounded-card p-5 mb-6 flex items-end gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1.5" htmlFor="contamination">
              Sensibilite de detection
            </label>
            <select
              id="contamination"
              value={contamination}
              onChange={(e) => {
                setContamination(Number(e.target.value));
                setPage(0);
              }}
              className="text-sm border border-hairline rounded-control px-2.5 py-2 bg-black/[0.03] text-text-primary focus:outline-none focus:border-brand w-56"
            >
              {CONTAMINATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {data && (
            <p className="text-[11.5px] text-text-faint font-sans pb-2">
              {data.totalElements} anomalie(s) sur {data.nombreDossiersAnalyses.toLocaleString('fr-TN')} dossiers analyses
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-danger bg-status-critique-bg border border-danger/20 rounded-control px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {loading && <p className="text-text-muted font-sans">Chargement...</p>}

        {!loading && data?.content.length === 0 && (
          <p className="text-text-muted font-sans">Aucune anomalie detectee avec ces parametres.</p>
        )}

        <div className="space-y-2.5">
          {!loading &&
            data?.content.map((a) => (
              <div
                key={a.id}
                className="bg-panel border border-hairline rounded-card pl-4 pr-5 py-3.5"
                style={{ borderLeft: '3px solid #C85A42' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className="font-mono text-[11px] text-text-muted">{a.codeSinistre}</span>
                      <span className="text-[13px] font-medium text-text-primary">{a.nSinistre}</span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          a.statut === 'OUVERT'
                            ? 'bg-status-ouvert-bg text-status-ouvert-text'
                            : 'bg-status-cloture-bg text-success'
                        }`}
                      >
                        {a.statut === 'OUVERT' ? 'Ouvert' : 'Cloture'}
                      </span>
                      <span className="font-mono text-[10.5px] text-brand-bright">
                        score {a.scoreAnomalie.toFixed(3)}
                      </span>
                    </div>
                    <ul className="space-y-0.5">
                      {a.raisons.map((r, i) => (
                        <li key={i} className="text-[12.5px] text-text-muted font-sans">
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link
                    to={`/sinistres/${a.id}`}
                    className="text-[12px] text-brand-bright hover:underline shrink-0 font-sans"
                  >
                    Voir le dossier
                  </Link>
                </div>
              </div>
            ))}
        </div>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between mt-5 text-sm text-text-muted font-sans">
            <span>
              Page {data.number + 1} / {data.totalPages}
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
                disabled={data.number + 1 >= data.totalPages}
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
