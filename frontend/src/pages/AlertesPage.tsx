import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { fetchAlertes, type AlertesPage as AlertesPageData } from '../services/alertesService';

const PAGE_SIZE = 20;

const RULE_OPTIONS = [
  { value: 'delai_depasse', label: 'Delai de traitement depasse' },
  { value: 'sans_reglement', label: 'Sans reglement enregistre' },
  { value: 'en_attente_quittance', label: 'En attente de quittance signee' },
  { value: 'non_cloture', label: 'Tous les dossiers non clotures' },
];

const DEFAULT_RULES = ['delai_depasse', 'sans_reglement', 'en_attente_quittance'];

export default function AlertesPage() {
  const [page, setPage] = useState(0);
  const [seuilInput, setSeuilInput] = useState(90);
  const [seuilApplique, setSeuilApplique] = useState(90);
  const [reglesDraft, setReglesDraft] = useState<string[]>(DEFAULT_RULES);
  const [reglesAppliquees, setReglesAppliquees] = useState<string[]>(DEFAULT_RULES);
  const [data, setData] = useState<AlertesPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchAlertes(page, PAGE_SIZE, seuilApplique, reglesAppliquees)
      .then(setData)
      .catch(() => setError('Impossible de charger les alertes.'))
      .finally(() => setLoading(false));
  }, [page, seuilApplique, reglesAppliquees]);

  const toggleRule = (value: string) => {
    setReglesDraft((prev) =>
      prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value]
    );
  };

  const appliquer = () => {
    setSeuilApplique(seuilInput);
    setReglesAppliquees(reglesDraft.length ? reglesDraft : DEFAULT_RULES);
    setPage(0);
  };

  return (
    <Layout>
      <div className="max-w-content mx-auto px-9 py-7">
        <div className="mb-6">
          <h2 className="font-serif text-[25px] font-semibold text-text-primary tracking-tight">Alertes</h2>
          <p className="text-text-muted text-[13px] mt-1 font-sans">
            Moteur de regles configurable pour detecter les dossiers necessitant une action.
          </p>
        </div>

        <div className="bg-panel border border-hairline rounded-card p-5 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {RULE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-[12.5px] text-text-primary font-sans cursor-pointer">
                <input
                  type="checkbox"
                  checked={reglesDraft.includes(opt.value)}
                  onChange={() => toggleRule(opt.value)}
                  className="accent-[#3E8A4C]"
                />
                {opt.label}
              </label>
            ))}
          </div>
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1.5" htmlFor="seuil">
                Seuil (jours)
              </label>
              <input
                id="seuil"
                type="number"
                min={1}
                value={seuilInput}
                onChange={(e) => setSeuilInput(Number(e.target.value))}
                className="input w-32"
              />
            </div>
            <button
              onClick={appliquer}
              className="text-canvas-deep text-sm font-bold px-4 py-2.5 rounded-control transition-all hover:brightness-105"
              style={{
                background: 'linear-gradient(135deg, #8DC63F, #3E8A4C)',
                boxShadow: '0 8px 20px rgba(141,198,63,0.22)',
              }}
            >
              Appliquer
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-danger bg-status-critique-bg border border-danger/20 rounded-control px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between mb-3.5">
          <h3 className="font-serif text-base font-semibold text-text-primary">
            {data ? `${data.totalElements.toLocaleString('fr-TN')} dossier(s) en alerte` : 'Dossiers en alerte'}
          </h3>
        </div>

        {loading && <p className="text-text-muted font-sans">Chargement...</p>}

        {!loading && data?.content.length === 0 && (
          <p className="text-text-muted font-sans">Aucun dossier ne correspond aux regles selectionnees.</p>
        )}

        <div className="space-y-2.5">
          {!loading &&
            data?.content.map((d) => (
              <div
                key={d.id}
                className="bg-panel border border-hairline rounded-card pl-4 pr-5 py-3.5"
                style={{ borderLeft: '3px solid #C85A42' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className="font-mono text-[11px] text-text-muted">{d.codeSinistre}</span>
                      <span className="text-[13px] font-medium text-text-primary">{d.nSinistre}</span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          d.statut === 'OUVERT'
                            ? 'bg-status-ouvert-bg text-status-ouvert-text'
                            : 'bg-status-cloture-bg text-success'
                        }`}
                      >
                        {d.statut === 'OUVERT' ? 'Ouvert' : 'Cloture'}
                      </span>
                    </div>
                    <ul className="space-y-0.5">
                      {d.motifs.map((m) => (
                        <li key={m.code} className="text-[12.5px] text-text-muted font-sans">
                          {m.texte}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link
                    to={`/sinistres/${d.id}`}
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
