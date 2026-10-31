import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  fetchDureeMetrics,
  fetchMontantMetrics,
  predictDuree,
  predictMontant,
  type ComparaisonModeles,
  type DossierSimilaire,
  type DureePredictionResponse,
  type FacteurExplicatif,
  type MontantPredictionResponse,
} from '../services/predictionsService';
import { fetchScoresPage, fetchScoresStats, type ScoreDossier, type ScoresDistribution } from '../services/scoresService';

function SectionHead({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-baseline justify-between mt-9 mb-3.5">
      <h3 className="font-serif text-base font-semibold text-text-primary">{title}</h3>
      <span className="text-[11.5px] text-text-faint font-sans">{hint}</span>
    </div>
  );
}

function MetricsTable({ comparaison }: { comparaison: ComparaisonModeles }) {
  const hasNegativeR2 = Object.values(comparaison.resultats).every((m) => m.r2 < 0);
  return (
    <div className="bg-panel border border-hairline rounded-card overflow-hidden">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="border-b border-hairline">
            <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">Modele</th>
            <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">MAE</th>
            <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">RMSE</th>
            <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">R²</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(comparaison.resultats).map(([name, m], i, arr) => {
            const isBest = name === comparaison.meilleurModele;
            return (
              <tr key={name} className={i < arr.length - 1 ? 'border-b border-hairline' : ''}>
                <td className={`px-4 py-2.5 ${isBest ? 'text-brand-bright font-semibold' : 'text-text-primary'}`}>
                  {name}
                  {isBest && <span className="ml-2 text-[10px] text-brand-bright">meilleur</span>}
                </td>
                <td className="px-4 py-2.5 text-right font-mono">{m.mae}</td>
                <td className="px-4 py-2.5 text-right font-mono">{m.rmse}</td>
                <td className="px-4 py-2.5 text-right font-mono">{m.r2}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-[11px] text-text-faint px-4 py-3 border-t border-hairline font-sans">
        Entraine sur {comparaison.nombreDossiersEntrainement.toLocaleString('fr-TN')} dossiers.
        {hasNegativeR2 && ' R² negatif : les variables utilisees expliquent mal ce cas, a interpreter avec prudence.'}
      </p>
    </div>
  );
}

function FacteursExplicatifs({ facteurs }: { facteurs: FacteurExplicatif[] }) {
  if (facteurs.length === 0) return null;
  const max = Math.max(...facteurs.map((f) => f.importancePct), 1);
  return (
    <div className="mt-4 pt-4 border-t border-hairline">
      <h4 className="font-serif text-[13.5px] font-semibold text-text-primary mb-1">Pourquoi cette estimation ?</h4>
      <p className="text-[11px] text-text-faint font-sans mb-3">
        Facteurs explicatifs (approximation par permutation) — corrélations apprises par le modèle, pas des causes certaines.
      </p>
      <div className="space-y-2">
        {facteurs.map((f) => (
          <div key={f.feature} className="flex items-center gap-3">
            <span className="text-[11.5px] text-text-muted font-sans w-[220px] shrink-0" title={f.feature}>{f.feature}</span>
            <div className="flex-1 h-2 rounded-full bg-hairline overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(f.importancePct / max) * 100}%`,
                  background: 'linear-gradient(90deg,#3E8A4C,#8DC63F)',
                }}
              />
            </div>
            <span className="text-[11px] font-mono text-text-primary w-10 text-right shrink-0">{f.importancePct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DossiersSimilaires({ dossiers }: { dossiers: DossierSimilaire[] }) {
  if (dossiers.length === 0) return null;
  return (
    <div className="mt-5 pt-4 border-t border-hairline">
      <h4 className="font-serif text-[13.5px] font-semibold text-text-primary mb-1">Dossiers similaires</h4>
      <p className="text-[11px] text-text-faint font-sans mb-3">
        5 dossiers clôturés les plus proches (nature, type, processus, montant, durée).
      </p>
      <div className="space-y-1.5">
        {dossiers.map((d) => (
          <div key={d.id} className="flex items-center justify-between text-[12px] font-sans py-1.5 px-2.5 rounded-control bg-black/[0.02]">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-text-muted text-[11px]">{d.codeSinistre}</span>
              <span className="text-text-primary">{d.nSinistre}</span>
              <span className="text-text-faint text-[11px]">
                {d.natureSin}/{d.typeSin} · {d.processus}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-text-muted text-[11px]">
                {d.montantTotalRegle.toLocaleString('fr-TN', { minimumFractionDigits: 3 })} DT · {d.dureeJours} j
              </span>
              <Link to={`/sinistres/${d.id}`} className="text-brand-bright hover:underline text-[11.5px]">
                Voir
              </Link>
              <span className="font-mono text-brand-bright text-[11px] w-11 text-right">{d.similaritePct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export default function PredictionsPage() {
  const [dureeMetrics, setDureeMetrics] = useState<ComparaisonModeles | null>(null);
  const [montantMetrics, setMontantMetrics] = useState<ComparaisonModeles | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [dureeForm, setDureeForm] = useState({
    natureSin: 'F',
    typeSin: 'M',
    processus: 'Processus Standard',
    montantEstime: 3000,
    dateOuverture: new Date().toISOString().slice(0, 10),
  });
  const [dureeResult, setDureeResult] = useState<DureePredictionResponse | null>(null);
  const [dureeSaving, setDureeSaving] = useState(false);

  const [montantForm, setMontantForm] = useState({
    natureSin: 'F',
    typeSin: 'M',
    processus: 'Processus Standard',
    sinistreOuvertureJours: 5,
    ouvertureOrdonnancementJours: 30,
  });
  const [montantResult, setMontantResult] = useState<MontantPredictionResponse | null>(null);
  const [montantSaving, setMontantSaving] = useState(false);

  const [scoresStats, setScoresStats] = useState<ScoresDistribution | null>(null);
  const [pireDossiers, setPireDossiers] = useState<ScoreDossier[]>([]);

  useEffect(() => {
    fetchDureeMetrics().then(setDureeMetrics).catch(() => setError('Impossible de charger le modele de duree.'));
    fetchMontantMetrics().then(setMontantMetrics).catch(() => setError('Impossible de charger le modele de montant.'));
    fetchScoresStats().then(setScoresStats).catch(() => setError('Impossible de charger les scores.'));
    fetchScoresPage(0, 8, false).then((p) => setPireDossiers(p.content)).catch(() => {});
  }, []);

  const handleDureeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setDureeSaving(true);
    try {
      setDureeResult(await predictDuree(dureeForm));
    } finally {
      setDureeSaving(false);
    }
  };

  const handleMontantSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMontantSaving(true);
    try {
      setMontantResult(await predictMontant(montantForm));
    } finally {
      setMontantSaving(false);
    }
  };

  const classementColor: Record<string, string> = {
    Excellent: 'text-success',
    Bon: 'text-teal',
    Moyen: 'text-brand-bright',
    Critique: 'text-danger',
  };

  return (
    <Layout>
      <div className="max-w-content mx-auto px-9 py-7">
        <div className="mb-6">
          <h2 className="font-serif text-[25px] font-semibold text-text-primary tracking-tight">Predictions</h2>
          <p className="text-text-muted text-[13px] mt-1 font-sans">
            Modeles de regression (Random Forest, XGBoost, Gradient Boosting) entraines sur le portefeuille reel.
          </p>
        </div>

        {error && (
          <p className="text-sm text-danger bg-status-critique-bg border border-danger/20 rounded-control px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <SectionHead title="Duree de traitement" hint="Regression - jours avant cloture" />
        {dureeMetrics ? <MetricsTable comparaison={dureeMetrics} /> : <p className="text-text-muted font-sans">Chargement...</p>}

        <div className="bg-panel border border-hairline rounded-card p-5 mt-4">
          <form onSubmit={handleDureeSubmit} className="grid grid-cols-2 md:grid-cols-5 gap-3.5 items-end">
            <Field label="Nature">
              <select className="input" value={dureeForm.natureSin} onChange={(e) => setDureeForm({ ...dureeForm, natureSin: e.target.value })}>
                <option value="F">F</option>
                <option value="D">D</option>
                <option value="R">R</option>
              </select>
            </Field>
            <Field label="Type">
              <select className="input" value={dureeForm.typeSin} onChange={(e) => setDureeForm({ ...dureeForm, typeSin: e.target.value })}>
                <option value="M">M</option>
                <option value="C">C</option>
              </select>
            </Field>
            <Field label="Processus">
              <select className="input" value={dureeForm.processus} onChange={(e) => setDureeForm({ ...dureeForm, processus: e.target.value })}>
                <option value="Processus Standard">Standard</option>
                <option value="Processus Express">Express</option>
              </select>
            </Field>
            <Field label="Montant estime (DT)">
              <input type="number" className="input" value={dureeForm.montantEstime} onChange={(e) => setDureeForm({ ...dureeForm, montantEstime: Number(e.target.value) })} />
            </Field>
            <Field label="Date ouverture">
              <input type="date" className="input" value={dureeForm.dateOuverture} onChange={(e) => setDureeForm({ ...dureeForm, dateOuverture: e.target.value })} />
            </Field>
            <button
              type="submit"
              disabled={dureeSaving}
              className="text-canvas-deep text-sm font-bold px-4 py-2.5 rounded-control transition-all hover:brightness-105 disabled:opacity-60 col-span-2 md:col-span-1"
              style={{ background: 'linear-gradient(135deg, #8DC63F, #3E8A4C)', boxShadow: '0 8px 20px rgba(141,198,63,0.22)' }}
            >
              {dureeSaving ? 'Calcul...' : 'Estimer'}
            </button>
          </form>
          {dureeResult && (
            <>
              <div className="mt-4 pt-4 border-t border-hairline">
                <span className="font-serif text-[26px] font-semibold text-text-primary">{dureeResult.joursEstimes}</span>
                <span className="text-sm text-text-muted ml-2 font-sans">jours estimes avant cloture</span>
                <span className="text-[11px] text-text-faint ml-2 font-sans">(modele : {dureeResult.modeleUtilise})</span>
              </div>
              <FacteursExplicatifs facteurs={dureeResult.facteursExplicatifs} />
              <DossiersSimilaires dossiers={dureeResult.dossiersSimilaires} />
            </>
          )}
        </div>

        <SectionHead title="Montant de reglement" hint="Regression - montant estime" />
        {montantMetrics ? <MetricsTable comparaison={montantMetrics} /> : <p className="text-text-muted font-sans">Chargement...</p>}

        <div className="bg-panel border border-hairline rounded-card p-5 mt-4">
          <form onSubmit={handleMontantSubmit} className="grid grid-cols-2 md:grid-cols-5 gap-3.5 items-end">
            <Field label="Nature">
              <select className="input" value={montantForm.natureSin} onChange={(e) => setMontantForm({ ...montantForm, natureSin: e.target.value })}>
                <option value="F">F</option>
                <option value="D">D</option>
                <option value="R">R</option>
              </select>
            </Field>
            <Field label="Type">
              <select className="input" value={montantForm.typeSin} onChange={(e) => setMontantForm({ ...montantForm, typeSin: e.target.value })}>
                <option value="M">M</option>
                <option value="C">C</option>
              </select>
            </Field>
            <Field label="Processus">
              <select className="input" value={montantForm.processus} onChange={(e) => setMontantForm({ ...montantForm, processus: e.target.value })}>
                <option value="Processus Standard">Standard</option>
                <option value="Processus Express">Express</option>
              </select>
            </Field>
            <Field label="Delai Sin.->Ouv. (j)">
              <input type="number" className="input" value={montantForm.sinistreOuvertureJours} onChange={(e) => setMontantForm({ ...montantForm, sinistreOuvertureJours: Number(e.target.value) })} />
            </Field>
            <Field label="Delai Ouv.->Ord. (j)">
              <input type="number" className="input" value={montantForm.ouvertureOrdonnancementJours} onChange={(e) => setMontantForm({ ...montantForm, ouvertureOrdonnancementJours: Number(e.target.value) })} />
            </Field>
            <button
              type="submit"
              disabled={montantSaving}
              className="text-canvas-deep text-sm font-bold px-4 py-2.5 rounded-control transition-all hover:brightness-105 disabled:opacity-60 col-span-2 md:col-span-1"
              style={{ background: 'linear-gradient(135deg, #8DC63F, #3E8A4C)', boxShadow: '0 8px 20px rgba(141,198,63,0.22)' }}
            >
              {montantSaving ? 'Calcul...' : 'Estimer'}
            </button>
          </form>
          {montantResult && (
            <>
              <div className="mt-4 pt-4 border-t border-hairline">
                <span className="font-serif text-[26px] font-semibold text-text-primary">{montantResult.montantEstime.toLocaleString('fr-TN', { minimumFractionDigits: 3 })}</span>
                <span className="text-sm text-text-muted ml-2 font-sans">DT estimes</span>
                <span className="text-[11px] text-text-faint ml-2 font-sans">(modele : {montantResult.modeleUtilise})</span>
              </div>
              <FacteursExplicatifs facteurs={montantResult.facteursExplicatifs} />
              <DossiersSimilaires dossiers={montantResult.dossiersSimilaires} />
            </>
          )}
        </div>

        <SectionHead title="Score de performance" hint="0-100 : rapidite, reglement, cloture" />
        {scoresStats && (
          <div className="bg-panel rounded-card border border-hairline flex flex-wrap divide-x divide-hairline mb-4">
            <div className="flex-1 min-w-[150px] px-5 py-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">Score moyen</p>
              <p className="font-serif text-[27px] font-semibold text-text-primary mt-2.5 leading-none">{scoresStats.scoreMoyen}</p>
            </div>
            <div className="flex-1 min-w-[130px] px-5 py-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">Excellent</p>
              <p className="font-serif text-[27px] font-semibold text-success mt-2.5 leading-none">{scoresStats.excellent}</p>
            </div>
            <div className="flex-1 min-w-[130px] px-5 py-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">Bon</p>
              <p className="font-serif text-[27px] font-semibold text-teal mt-2.5 leading-none">{scoresStats.bon}</p>
            </div>
            <div className="flex-1 min-w-[130px] px-5 py-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">Moyen</p>
              <p className="font-serif text-[27px] font-semibold text-brand-bright mt-2.5 leading-none">{scoresStats.moyen}</p>
            </div>
            <div className="flex-1 min-w-[130px] px-5 py-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">Critique</p>
              <p className="font-serif text-[27px] font-semibold text-danger mt-2.5 leading-none">{scoresStats.critique}</p>
            </div>
          </div>
        )}

        {pireDossiers.length > 0 && (
          <div className="bg-panel border border-hairline rounded-card overflow-hidden">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-hairline">
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">Code</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">N Sinistre</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">Classement</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">Score</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wide text-text-faint font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pireDossiers.map((d, i) => (
                  <tr key={d.id} className={i < pireDossiers.length - 1 ? 'border-b border-hairline' : ''}>
                    <td className="px-4 py-2.5 font-mono text-text-muted text-[11px]">{d.codeSinistre}</td>
                    <td className="px-4 py-2.5">{d.nSinistre}</td>
                    <td className={`px-4 py-2.5 font-medium ${classementColor[d.classement]}`}>{d.classement}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{d.score}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link to={`/sinistres/${d.id}`} className="text-[12px] text-brand-bright hover:underline">
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
