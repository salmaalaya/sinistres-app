import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { deleteSinistre, fetchSinistres } from '../services/sinistreService';
import type { PageResponse, Sinistre, SinistreFilters } from '../types';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZE = 15;

const selectClass =
  'text-sm border border-hairline rounded-control px-2.5 py-2 bg-black/[0.03] text-text-primary focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';
const inputClass = selectClass;

export default function SinistresListPage() {
  const { role } = useAuth();
  const [data, setData] = useState<PageResponse<Sinistre> | null>(null);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<SinistreFilters>({});
  const [draftFilters, setDraftFilters] = useState<SinistreFilters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (targetPage: number, activeFilters: SinistreFilters) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSinistres(activeFilters, targetPage, PAGE_SIZE);
      setData(result);
    } catch {
      setError('Impossible de charger les sinistres. Verifiez que le backend tourne bien.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  const applyFilters = () => {
    setPage(0);
    setFilters(draftFilters);
  };

  const resetFilters = () => {
    setDraftFilters({});
    setFilters({});
    setPage(0);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Supprimer definitivement ce sinistre ?')) return;
    await deleteSinistre(id);
    load(page, filters);
  };

  return (
    <Layout>
      <div className="max-w-content mx-auto px-8 py-9">
        <div className="flex items-center justify-between mb-7">
          <div>
            <h2 className="font-serif text-[26px] font-semibold text-text-primary">Sinistres</h2>
            <p className="text-sm text-text-muted mt-1 font-sans">
              {data ? `${data.totalElements} dossier(s)` : '...'}
            </p>
          </div>
          <Link
            to="/sinistres/nouveau"
            className="text-canvas-deep text-sm font-bold px-4 py-2.5 rounded-control transition-all hover:brightness-105"
            style={{
              background: 'linear-gradient(135deg, #8DC63F, #3E8A4C)',
              boxShadow: '0 8px 20px rgba(141,198,63,0.22)',
            }}
          >
            + Nouveau sinistre
          </Link>
        </div>

        <div className="bg-panel rounded-card border border-hairline p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <select
              className={selectClass}
              value={draftFilters.nature ?? ''}
              onChange={(e) => setDraftFilters({ ...draftFilters, nature: e.target.value || undefined })}
            >
              <option value="">Nature</option>
              <option value="F">F</option>
              <option value="D">D</option>
              <option value="R">R</option>
            </select>

            <select
              className={selectClass}
              value={draftFilters.type ?? ''}
              onChange={(e) => setDraftFilters({ ...draftFilters, type: e.target.value || undefined })}
            >
              <option value="">Type</option>
              <option value="M">M</option>
              <option value="C">C</option>
            </select>

            <select
              className={selectClass}
              value={draftFilters.statut ?? ''}
              onChange={(e) => setDraftFilters({ ...draftFilters, statut: e.target.value || undefined })}
            >
              <option value="">Statut</option>
              <option value="OUVERT">Ouvert</option>
              <option value="CLOTURE">Cloture</option>
            </select>

            <input
              type="text"
              placeholder="Processus"
              className={inputClass}
              value={draftFilters.processus ?? ''}
              onChange={(e) => setDraftFilters({ ...draftFilters, processus: e.target.value || undefined })}
            />

            <input
              type="date"
              className={inputClass}
              value={draftFilters.dateOuvertureDebut ?? ''}
              onChange={(e) =>
                setDraftFilters({ ...draftFilters, dateOuvertureDebut: e.target.value || undefined })
              }
            />
            <input
              type="date"
              className={inputClass}
              value={draftFilters.dateOuvertureFin ?? ''}
              onChange={(e) =>
                setDraftFilters({ ...draftFilters, dateOuvertureFin: e.target.value || undefined })
              }
            />

            <input
              type="number"
              placeholder="Montant min"
              className={inputClass}
              value={draftFilters.montantMin ?? ''}
              onChange={(e) =>
                setDraftFilters({
                  ...draftFilters,
                  montantMin: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
            <input
              type="number"
              placeholder="Montant max"
              className={inputClass}
              value={draftFilters.montantMax ?? ''}
              onChange={(e) =>
                setDraftFilters({
                  ...draftFilters,
                  montantMax: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={applyFilters}
              className="bg-panel-raised hover:brightness-110 text-text-primary text-sm font-medium rounded-control px-4 py-2 transition-all border border-hairline"
            >
              Filtrer
            </button>
            <button
              onClick={resetFilters}
              className="text-sm text-text-muted hover:text-brand-bright px-3 transition-colors"
            >
              Reinitialiser
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-danger bg-status-critique-bg border border-danger/20 rounded-control px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <div className="bg-panel rounded-card border border-hairline overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-hairline">
                <th className="text-left px-4 py-3 font-medium text-[10.5px] uppercase tracking-wide text-text-muted">
                  Code
                </th>
                <th className="text-left px-4 py-3 font-medium text-[10.5px] uppercase tracking-wide text-text-muted">
                  N&deg; Sinistre
                </th>
                <th className="text-left px-4 py-3 font-medium text-[10.5px] uppercase tracking-wide text-text-muted">
                  Ouverture
                </th>
                <th className="text-left px-4 py-3 font-medium text-[10.5px] uppercase tracking-wide text-text-muted">
                  Nature
                </th>
                <th className="text-left px-4 py-3 font-medium text-[10.5px] uppercase tracking-wide text-text-muted">
                  Type
                </th>
                <th className="text-left px-4 py-3 font-medium text-[10.5px] uppercase tracking-wide text-text-muted">
                  Processus
                </th>
                <th className="text-left px-4 py-3 font-medium text-[10.5px] uppercase tracking-wide text-text-muted">
                  Statut
                </th>
                <th className="text-right px-4 py-3 font-medium text-[10.5px] uppercase tracking-wide text-text-muted">
                  Montant regle
                </th>
                <th className="text-right px-4 py-3 font-medium text-[10.5px] uppercase tracking-wide text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="text-center text-text-muted py-10 font-sans">
                    Chargement...
                  </td>
                </tr>
              )}
              {!loading && data?.content.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-text-muted py-10 font-sans">
                    Aucun sinistre ne correspond a ces criteres.
                  </td>
                </tr>
              )}
              {!loading &&
                data?.content.map((s, i) => (
                  <tr
                    key={s.id}
                    className={`hover:bg-black/[0.02] transition-colors ${
                      i < (data?.content.length ?? 0) - 1 ? 'border-b border-hairline' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">{s.codeSinistre}</td>
                    <td className="px-4 py-3 font-mono text-xs">{s.nSinistre}</td>
                    <td className="px-4 py-3">{s.dateOuverture}</td>
                    <td className="px-4 py-3">{s.natureSin}</td>
                    <td className="px-4 py-3">{s.typeSin}</td>
                    <td className="px-4 py-3">{s.processus}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          s.statut === 'OUVERT'
                            ? 'bg-status-ouvert-bg text-status-ouvert-text'
                            : 'bg-status-cloture-bg text-success'
                        }`}
                      >
                        {s.statut === 'OUVERT' ? 'Ouvert' : 'Cloture'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {s.montantTotalRegle.toLocaleString('fr-TN', { minimumFractionDigits: 3 })}
                    </td>
                    <td className="px-4 py-3 text-right space-x-3">
                      <Link to={`/sinistres/${s.id}`} className="text-text-muted hover:text-brand-bright text-xs">
                        Modifier
                      </Link>
                      {role === 'ADMIN' && (
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="text-danger hover:underline text-xs"
                        >
                          Supprimer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-text-muted font-sans">
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
