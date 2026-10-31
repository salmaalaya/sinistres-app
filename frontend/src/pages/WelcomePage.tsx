import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { fetchBriefing, markBriefingSeen, type BriefingResponse } from '../services/briefingService';

function formatMontantCourt(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('fr-TN', { maximumFractionDigits: 2 })} M`;
  if (v >= 1_000) return `${(v / 1_000).toLocaleString('fr-TN', { maximumFractionDigits: 1 })} K`;
  return v.toLocaleString('fr-TN', { maximumFractionDigits: 0 });
}

export default function WelcomePage() {
  const { username } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<BriefingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBriefing()
      .then(setData)
      .catch(() => setError('Impossible de charger le briefing.'));
  }, []);

  const goTo = async (path: string) => {
    try {
      await markBriefingSeen();
    } finally {
      navigate(path);
    }
  };

  const today = new Date().toLocaleDateString('fr-TN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Layout>
      <div className="max-w-content mx-auto px-9 py-9">
        {error && (
          <p className="text-sm text-danger bg-status-critique-bg border border-danger/20 rounded-control px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {!data && !error && <p className="text-text-muted font-sans">Chargement...</p>}

        {data && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-faint font-sans capitalize">
              {today} · premiere connexion
            </p>
            <h2 className="font-serif text-[34px] font-semibold text-text-primary tracking-tight mt-2">
              Bonjour {username ?? data.prenom}.
            </h2>
            <p className="text-text-muted text-[14px] mt-2 max-w-[620px] font-sans">
              Votre portefeuille existe deja dans la base. Voici son etat ce matin — rien a configurer.
            </p>

            <div
              className="rounded-card p-8 mt-6 relative overflow-hidden"
              style={{ background: 'linear-gradient(120deg, #16301E 0%, #1B4D2E 100%)', border: '1px solid rgba(141,198,63,0.16)' }}
            >
              <div
                className="absolute rounded-full pointer-events-none"
                style={{ right: -70, top: -70, width: 250, height: 250, background: 'rgba(141,198,63,0.08)' }}
              />
              <p className="text-[10.5px] font-semibold uppercase tracking-wide font-sans" style={{ color: '#8FA48C' }}>
                Votre portefeuille
              </p>
              <div className="flex gap-12 mt-5 flex-wrap">
                <div>
                  <div className="font-serif text-[42px] font-semibold leading-none" style={{ color: '#F4FAF0' }}>
                    {data.dossiersActifs.toLocaleString('fr-TN')}
                  </div>
                  <div className="text-[12px] mt-2 font-sans" style={{ color: 'rgba(255,255,255,.7)' }}>dossiers actifs</div>
                </div>
                <div className="w-px" style={{ background: 'rgba(255,255,255,.12)' }} />
                <div>
                  <div className="font-serif text-[42px] font-semibold text-danger leading-none">
                    {data.dossiersCritiques.toLocaleString('fr-TN')}
                  </div>
                  <div className="text-[12px] mt-2 font-sans" style={{ color: 'rgba(255,255,255,.7)' }}>au-dela du delai cible</div>
                </div>
                <div className="w-px" style={{ background: 'rgba(255,255,255,.12)' }} />
                <div>
                  <div className="font-serif text-[42px] font-semibold text-brand-bright leading-none">
                    {formatMontantCourt(data.expositionTotale)}
                  </div>
                  <div className="text-[12px] mt-2 font-sans" style={{ color: 'rgba(255,255,255,.7)' }}>TND d&apos;exposition</div>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-8 flex-wrap">
                <button
                  onClick={() => goTo('/delais')}
                  className="text-canvas-deep text-sm font-bold px-6 py-3.5 rounded-control transition-all hover:brightness-105"
                  style={{ background: 'linear-gradient(135deg, #8DC63F, #3E8A4C)', boxShadow: '0 8px 20px rgba(141,198,63,0.24)' }}
                >
                  Traiter les {data.dossiersCritiques.toLocaleString('fr-TN')} dossiers en retard
                </button>
                <button
                  onClick={() => goTo('/dashboard')}
                  className="text-sm font-semibold px-5 py-3.5 rounded-control border transition-colors"
                  style={{ color: '#F4FAF0', borderColor: 'rgba(255,255,255,.24)' }}
                >
                  Voir le tableau de bord
                </button>
              </div>
            </div>

            <div className="flex gap-5 mt-6 flex-wrap">
              <div className="flex-1 min-w-[320px] bg-panel border border-hairline rounded-card p-6">
                <h4 className="font-serif text-[15.5px] font-semibold text-text-primary">Ce que vous faites ici</h4>
                <div className="flex flex-col gap-3.5 mt-4">
                  <FeatureRow title="Enregistrer et instruire les dossiers" detail="Saisie manuelle ou lecture automatique d'un constat (Scanner)" />
                  <FeatureRow title="Suivre les delais et la charge" detail="Par dossier, par gestionnaire, par periode" />
                  <FeatureRow title="Chiffrer l'exposition financiere" detail="Reglements, provisions, previsions" />
                </div>
              </div>

              <div className="flex-1 min-w-[320px] bg-panel-raised border border-hairline rounded-card p-6">
                <h4 className="font-serif text-[15.5px] font-semibold text-text-primary">Ce que la plateforme surveille pour vous</h4>
                <div className="flex flex-col gap-2.5 mt-4">
                  <WatchRow
                    label="Dossiers qui approchent du delai"
                    value={data.dossiersApprochantSeuil}
                    color="#C98A2E"
                    onClick={() => goTo('/alertes')}
                  />
                  <WatchRow
                    label="Anomalies detectees"
                    value={data.anomaliesDetectees}
                    color="#C85A42"
                    onClick={() => goTo('/anomalies')}
                  />
                  <WatchRow
                    label="Champs incomplets a corriger"
                    value={data.champsIncomplets}
                    color="#2E8A8F"
                    onClick={() => goTo('/qualite-donnees')}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function FeatureRow({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-1.5 h-1.5 rounded-full bg-brand mt-2 shrink-0" />
      <div>
        <div className="text-[13px] font-semibold text-text-primary font-sans">{title}</div>
        <div className="text-[12px] text-text-faint mt-0.5 font-sans">{detail}</div>
      </div>
    </div>
  );
}

function WatchRow({
  label,
  value,
  color,
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between bg-panel rounded-control px-4 py-3 text-left transition-colors hover:border-brand-bright border border-transparent"
    >
      <span className="text-[12.5px] text-text-muted font-sans">{label}</span>
      <span className="font-serif text-[15px] font-semibold" style={{ color }}>
        {value.toLocaleString('fr-TN')}
      </span>
    </button>
  );
}
