import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { fetchQualiteDonnees, type QualiteDonnees } from '../services/qualiteService';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-TN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function completudeColor(pct: number): string {
  if (pct >= 95) return '#8DC63F';
  if (pct >= 70) return '#2E8A8F';
  return '#C85A42';
}

export default function QualiteDonneesPage() {
  const [data, setData] = useState<QualiteDonnees | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQualiteDonnees().then(setData).catch(() => setError('Impossible de charger la qualite des donnees.'));
  }, []);

  const doublonsSupprimes = data?.dernierImport
    ? data.dernierImport.lignesTraitees - data.dernierImport.lignesDedupliquees
    : null;

  const reglesNettoyage = data?.dernierImport
    ? [
        {
          regle: 'Deduplication des sinistres',
          detail: "Un CODE_SINISTRE peut apparaitre plusieurs fois dans le fichier source (un par reglement) — les sinistres sont dedupliques, chaque ligne restante devient un reglement rattache.",
          count: doublonsSupprimes,
          unite: 'doublons regroupes',
        },
        {
          regle: 'Processus manquant',
          detail: 'PROCESSUS vide -> valeur par defaut "Processus Standard".',
          count: data.dernierImport.processusDefaults,
          unite: 'lignes completees',
        },
        {
          regle: 'Montants negatifs',
          detail: 'MONTANT_REGLEMENT converti en valeur absolue (signe source non significatif).',
          count: data.dernierImport.montantsCorriges,
          unite: 'lignes corrigees',
        },
        {
          regle: 'Dates textuelles',
          detail: 'Dates au format JJ/MM/AAAA (source tunisienne) — parsees explicitement en jour-premier pour eviter toute ambiguite MM/JJ.',
          count: null,
          unite: '',
        },
      ]
    : [];

  return (
    <Layout>
      <div className="max-w-content mx-auto px-9 py-7">
        <div className="mb-6">
          <h2 className="font-serif text-[25px] font-semibold text-text-primary tracking-tight">Qualite des donnees</h2>
          <p className="text-text-muted text-[13px] mt-1 font-sans">
            Tracabilite du dernier import et completude des champs, calculees en direct depuis la base.
          </p>
        </div>

        {error && (
          <p className="text-sm text-danger bg-status-critique-bg border border-danger/20 rounded-control px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {data && (
          <>
            <div className="bg-panel rounded-card border border-hairline flex flex-wrap divide-x divide-hairline mb-6">
              <div className="flex-1 min-w-[180px] px-5 py-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">Total sinistres</p>
                <p className="font-serif text-[24px] font-semibold text-text-primary mt-2.5 leading-none">
                  {data.totalSinistres.toLocaleString('fr-TN')}
                </p>
              </div>
              <div className="flex-1 min-w-[180px] px-5 py-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">Total reglements</p>
                <p className="font-serif text-[24px] font-semibold text-text-primary mt-2.5 leading-none">
                  {data.totalReglements.toLocaleString('fr-TN')}
                </p>
              </div>
              <div className="flex-1 min-w-[220px] px-5 py-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">Dernier import</p>
                {data.dernierImport ? (
                  <>
                    <p className="font-serif text-[16px] font-semibold text-text-primary mt-2.5 leading-tight font-mono">
                      {data.dernierImport.nomFichier}
                    </p>
                    <p className="text-[11px] text-text-faint mt-1 font-sans capitalize">
                      {formatDate(data.dernierImport.dateImport)}
                    </p>
                  </>
                ) : (
                  <p className="text-[13px] text-text-muted mt-2.5 font-sans">Aucun import trace pour le moment.</p>
                )}
              </div>
              <div className="flex-1 min-w-[180px] px-5 py-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">Lignes traitees</p>
                <p className="font-serif text-[24px] font-semibold text-text-primary mt-2.5 leading-none">
                  {data.dernierImport ? data.dernierImport.lignesTraitees.toLocaleString('fr-TN') : '-'}
                </p>
                {data.dernierImport && (
                  <p className="text-[11px] text-text-faint mt-1.5 font-sans">
                    -&gt; {data.dernierImport.lignesDedupliquees.toLocaleString('fr-TN')} sinistres uniques
                  </p>
                )}
              </div>
            </div>

            {reglesNettoyage.length > 0 && (
              <>
                <h3 className="font-serif text-base font-semibold text-text-primary mt-8 mb-3.5">Regles de nettoyage appliquees</h3>
                <div className="bg-panel border border-hairline rounded-card overflow-hidden mb-8">
                  <table className="w-full text-[12.5px]">
                    <thead>
                      <tr className="border-b border-hairline">
                        <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">Regle</th>
                        <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">Detail</th>
                        <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reglesNettoyage.map((r, i) => (
                        <tr key={r.regle} className={i < reglesNettoyage.length - 1 ? 'border-b border-hairline' : ''}>
                          <td className="px-4 py-3 text-text-primary font-medium align-top">{r.regle}</td>
                          <td className="px-4 py-3 text-text-muted font-sans align-top">{r.detail}</td>
                          <td className="px-4 py-3 text-right font-mono text-brand-bright align-top whitespace-nowrap">
                            {r.count !== null ? (
                              <>
                                {r.count.toLocaleString('fr-TN')}
                                <span className="text-text-faint text-[10.5px] ml-1">{r.unite}</span>
                              </>
                            ) : (
                              <span className="text-text-faint">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <h3 className="font-serif text-base font-semibold text-text-primary mt-8 mb-3.5">Completude des champs</h3>
            <div className="bg-panel border border-hairline rounded-card p-5">
              <div className="space-y-2.5">
                {data.completude.map((c) => (
                  <div key={c.champ} className="flex items-center gap-3">
                    <span className="text-[12px] text-text-muted font-sans w-[200px] shrink-0">{c.champ}</span>
                    <div className="flex-1 h-2 rounded-full bg-hairline overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${c.pctComplet}%`, background: completudeColor(c.pctComplet) }}
                      />
                    </div>
                    <span
                      className="text-[11.5px] font-mono w-12 text-right shrink-0"
                      style={{ color: completudeColor(c.pctComplet) }}
                    >
                      {c.pctComplet}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
