import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import BiatLogo from '../components/BiatLogo';
import useReducedMotion from '../hooks/useReducedMotion';
import { fetchPublicStats, type PublicStats } from '../services/publicService';

const PARALLAX_CLAMP = 10;

function clamp(v: number, max: number): number {
  return Math.max(-max, Math.min(max, v));
}

const NAV_LINKS = [
  { href: '#fonctionnalites', label: 'Fonctionnalites' },
  { href: '#comment', label: 'Comment ca marche' },
  { href: '#apropos', label: 'A propos' },
];

const FEATURES = [
  { glyph: 'S', title: 'Gestion des sinistres', detail: "Creation, suivi et recherche multicritere de chaque dossier, du premier jour a la cloture." },
  { glyph: 'D', title: 'Delais & performance', detail: "Detection automatique des dossiers qui depassent les seuils critiques, avant qu'il ne soit trop tard." },
  { glyph: 'A', title: 'Anomalies IA', detail: "Un modele d'intelligence artificielle repere les montants et delais atypiques du portefeuille." },
  { glyph: 'P', title: 'Predictions', detail: "Estimation de la duree de traitement et du montant probable d'un dossier, avec ses facteurs explicatifs." },
  { glyph: 'M', title: 'Process mining', detail: 'Le parcours reel des dossiers reconstitue automatiquement, pour identifier les vrais goulets d’etranglement.' },
  { glyph: 'C', title: 'Assistant conversationnel', detail: 'Posez une question en francais sur le portefeuille — la requete generee reste toujours consultable.' },
];

export default function LandingPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const reducedMotion = useReducedMotion();
  const isTouchDevice = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
    []
  );
  const parallaxEnabled = !reducedMotion && !isTouchDevice;
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const parallaxRaf = useRef<number | null>(null);

  useEffect(() => {
    fetchPublicStats().then(setStats).catch(() => {});
  }, []);

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!parallaxEnabled || parallaxRaf.current !== null) return;
    const target = e.currentTarget;
    const clientX = e.clientX;
    const clientY = e.clientY;
    parallaxRaf.current = requestAnimationFrame(() => {
      const rect = target.getBoundingClientRect();
      setParallax({
        x: clientX - (rect.left + rect.width / 2),
        y: clientY - (rect.top + rect.height / 2),
      });
      parallaxRaf.current = null;
    });
  };

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 bg-canvas/85 backdrop-blur border-b border-hairline">
        <div className="max-w-content mx-auto px-10 h-[68px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <BiatLogo size={34} radius={9} />
            <span className="font-serif text-[17px] font-semibold text-text-primary">Sinistres BIAT</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-[13.5px] text-text-muted hover:text-text-primary transition-colors">
                {l.label}
              </a>
            ))}
          </nav>
          <Link
            to="/login"
            className="font-bold text-[13px] px-5 py-2.5 rounded-control transition-all hover:brightness-105"
            style={{
              background: 'linear-gradient(135deg, #8DC63F, #3E8A4C)',
              color: '#16211B',
              boxShadow: '0 6px 18px rgba(62,138,76,0.25)',
            }}
          >
            Se connecter
          </Link>
        </div>
      </header>

      <main>
        <section className="max-w-content mx-auto px-10 pt-[76px] pb-10 grid md:grid-cols-[1.05fr_0.95fr] gap-14 items-center">
          <div>
            <div
              className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.08em] uppercase px-3.5 py-1.5 rounded-full mb-5 font-sans"
              style={{ color: '#3E8A4C', background: 'rgba(62,138,76,0.10)', border: '1px solid rgba(62,138,76,0.16)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-brand" />
              Plateforme intelligente de gestion des sinistres
            </div>
            <h1 className="font-serif text-[48px] leading-[1.12] font-semibold text-text-primary tracking-tight mb-5">
              Voyez clair.
              <br />
              Decidez vite.
              <br />
              <span className="text-brand-bright">Gerez sereinement.</span>
            </h1>
            <p className="text-[15.5px] leading-relaxed text-text-muted max-w-[480px] mb-8 font-sans">
              Sinistres BIAT centralise le suivi de vos dossiers, detecte les retards avant
              qu&apos;ils ne deviennent critiques, et met l&apos;intelligence artificielle au
              service de vos decisions &mdash; sans jamais perdre la maitrise de vos donnees.
            </p>
            <div className="flex items-center gap-3.5 flex-wrap mb-11">
              <Link
                to="/login"
                className="font-bold text-[13.5px] px-6 py-3.5 rounded-control transition-all hover:brightness-105"
                style={{
                  background: 'linear-gradient(135deg, #8DC63F, #3E8A4C)',
                  color: '#16211B',
                  boxShadow: '0 10px 28px rgba(62,138,76,0.25)',
                }}
              >
                Acceder a la plateforme
              </Link>
              <a
                href="#fonctionnalites"
                className="font-semibold text-[13.5px] px-6 py-3.5 rounded-control border border-hairline text-text-primary hover:border-brand transition-colors"
              >
                Decouvrir les fonctionnalites
              </a>
            </div>
            <div className="flex items-center gap-7 flex-wrap text-[11.5px] text-text-faint font-sans">
              <TrustItem label="Donnees chiffrees" />
              <TrustItem label="Acces par role" />
              <TrustItem label="Assistant IA en lecture seule" />
            </div>
          </div>

          <div className="relative" onMouseMove={handleHeroMouseMove}>
            <HeroIllustration />
            <FloatingStat
              top={24}
              left={-4}
              label="Dossiers suivis"
              value={stats ? stats.totalDossiers.toLocaleString('fr-TN') : '—'}
              parallax={parallax}
              multiplier={0.02}
            />
            <FloatingStat
              top={24}
              right={-4}
              label="Taux de cloture"
              value={stats ? `${stats.pctCloture.toLocaleString('fr-TN')}%` : '—'}
              parallax={parallax}
              multiplier={0.03}
            />
            <FloatingStat
              bottom={24}
              left={-4}
              label="Modules intelligents"
              value="13"
              parallax={parallax}
              multiplier={0.025}
            />
          </div>
        </section>

        <section id="fonctionnalites" className="border-t border-hairline py-[70px]">
          <div className="max-w-content mx-auto px-10">
            <div className="text-center max-w-[600px] mx-auto mb-11">
              <div
                className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.08em] uppercase px-3.5 py-1.5 rounded-full mb-5 font-sans"
                style={{ color: '#3E8A4C', background: 'rgba(62,138,76,0.10)', border: '1px solid rgba(62,138,76,0.16)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                Une plateforme, tous les angles
              </div>
              <h2 className="font-serif text-[32px] font-semibold text-text-primary tracking-tight mb-3">
                Tout ce qu&apos;il faut pour piloter le portefeuille
              </h2>
              <p className="text-[14px] leading-relaxed text-text-muted font-sans">
                Du dossier individuel a la vision d&apos;ensemble, chaque module s&apos;appuie sur
                les memes donnees reelles &mdash; jamais de chiffres reconstitues separement.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="bg-panel border border-hairline rounded-card p-6 transition-colors hover:border-brand/40">
                  <div
                    className="w-[38px] h-[38px] rounded-control flex items-center justify-center font-serif font-bold text-[16px] mb-4"
                    style={{ background: 'rgba(62,138,76,0.12)', color: '#3E8A4C' }}
                  >
                    {f.glyph}
                  </div>
                  <h3 className="font-serif text-[16.5px] font-semibold text-text-primary mb-2">{f.title}</h3>
                  <p className="text-[12.8px] leading-relaxed text-text-muted font-sans">{f.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="comment" className="py-[70px]">
          <div className="max-w-content mx-auto px-10">
            <div
              className="rounded-card p-14 text-center relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #F5F8F0, #FFFFFF)', border: '1px solid rgba(62,138,76,0.18)' }}
            >
              <div
                className="absolute rounded-full pointer-events-none"
                style={{ top: -60, right: -60, width: 220, height: 220, background: 'radial-gradient(circle, rgba(141,198,63,0.18) 0%, transparent 70%)' }}
              />
              <h2 className="font-serif text-[28px] font-semibold text-text-primary tracking-tight mb-3.5">
                Pret a voir votre portefeuille autrement&nbsp;?
              </h2>
              <p className="text-[14px] text-text-muted mb-7 font-sans">
                Connectez-vous pour acceder au tableau de bord complet.
              </p>
              <Link
                to="/login"
                id="apropos"
                className="inline-block font-bold text-[13.5px] px-7 py-3.5 rounded-control transition-all hover:brightness-105"
                style={{
                  background: 'linear-gradient(135deg, #8DC63F, #3E8A4C)',
                  color: '#16211B',
                  boxShadow: '0 10px 28px rgba(62,138,76,0.25)',
                }}
              >
                Acceder a la plateforme
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline py-7 text-center">
        <p className="text-[11.5px] text-text-faint font-sans">
          Assurances BIAT &middot; Plateforme interne de gestion des sinistres
        </p>
      </footer>
    </div>
  );
}

function TrustItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#2E8A8F', boxShadow: '0 0 6px #2E8A8F' }} />
      {label}
    </div>
  );
}

function FloatingStat({
  label,
  value,
  top,
  bottom,
  left,
  right,
  parallax,
  multiplier = 0,
}: {
  label: string;
  value: string;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  parallax?: { x: number; y: number };
  multiplier?: number;
}) {
  const dx = parallax ? clamp(parallax.x * multiplier, PARALLAX_CLAMP) : 0;
  const dy = parallax ? clamp(parallax.y * multiplier, PARALLAX_CLAMP) : 0;
  return (
    <div
      className="absolute bg-panel rounded-control px-4 py-3"
      style={{
        top,
        bottom,
        left,
        right,
        border: '1px solid rgba(62,138,76,0.16)',
        boxShadow: '0 14px 32px rgba(20,32,26,0.1)',
        transform: `translate(${dx}px, ${dy}px)`,
        transition: 'transform 120ms ease-out',
      }}
    >
      <div className="text-[10px] uppercase tracking-wide text-text-faint font-sans mb-0.5">{label}</div>
      <div className="font-serif text-[22px] font-semibold text-brand-bright">{value}</div>
    </div>
  );
}

function HeroIllustration() {
  return (
    <div
      className="relative rounded-card overflow-hidden"
      style={{
        aspectRatio: '1.05',
        background: 'linear-gradient(160deg, #163D26 0%, #0A160E 100%)',
        border: '1px solid rgba(62,138,76,0.18)',
        boxShadow: '0 30px 70px rgba(20,32,26,0.16)',
      }}
    >
      <svg viewBox="0 0 400 400" className="w-full h-full">
        <defs>
          <linearGradient id="landingShield" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8DC63F" />
            <stop offset="100%" stopColor="#3E8A4C" />
          </linearGradient>
          <linearGradient id="landingDoc" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F0EAD9" />
          </linearGradient>
        </defs>

        <circle cx="200" cy="205" r="150" fill="rgba(141,198,63,0.08)" />
        <circle cx="120" cy="120" r="6" fill="#8DC63F" opacity="0.5" />
        <circle cx="320" cy="300" r="8" fill="#2E8A8F" opacity="0.4" />
        <circle cx="330" cy="110" r="5" fill="#D9A441" opacity="0.5" />

        <g transform="translate(120,90)">
          <rect x="10" y="16" width="130" height="170" rx="12" fill="#0F2116" opacity="0.5" transform="rotate(6 75 100)" />
          <rect x="0" y="0" width="140" height="180" rx="14" fill="url(#landingDoc)" />
          <rect x="20" y="28" width="100" height="10" rx="5" fill="#DDE3D4" />
          <rect x="20" y="48" width="70" height="8" rx="4" fill="#E4EFD9" />
          <rect x="20" y="80" width="100" height="7" rx="3.5" fill="#EDE6D8" />
          <rect x="20" y="96" width="86" height="7" rx="3.5" fill="#EDE6D8" />
          <rect x="20" y="112" width="94" height="7" rx="3.5" fill="#EDE6D8" />
          <rect x="20" y="140" width="56" height="18" rx="9" fill="#E4EFD9" />
          <text x="27" y="152" fontFamily="JetBrains Mono, monospace" fontSize="9" fontWeight="700" fill="#2F6B3A">
            SIN-2026
          </text>
        </g>

        <g transform="translate(215,205)">
          <path
            d="M50 0 L100 20 L100 65 C100 105 75 132 50 145 C25 132 0 105 0 65 L0 20 Z"
            fill="url(#landingShield)"
            stroke="#0A160E"
            strokeWidth="1.5"
          />
          <path
            d="M28 68 L44 84 L76 46"
            stroke="#F4FAF0"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
}
