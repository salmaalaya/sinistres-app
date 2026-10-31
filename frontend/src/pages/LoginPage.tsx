import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BiatLogo from '../components/BiatLogo';
import { fetchPublicStats } from '../services/publicService';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dossiersCount, setDossiersCount] = useState<number | null>(null);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPublicStats()
      .then((s) => {
        setDossiersCount(s.totalDossiers);
        setDbConnected(true);
      })
      .catch(() => setDbConnected(false));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { needsBriefing } = await login(username, password);
      navigate(needsBriefing ? '/bienvenue' : '/dashboard');
    } catch {
      setError('Identifiants incorrects. Verifiez votre nom d’utilisateur et votre mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div
        className="relative overflow-hidden px-8 py-9 md:px-11 md:py-10 flex flex-col text-white"
        style={{ background: 'radial-gradient(120% 100% at 15% 0%, #2E6B3F 0%, #163D26 45%, #12281A 100%)' }}
      >
        <div
          className="absolute rounded-full pointer-events-none"
          style={{ right: -140, top: -100, width: 420, height: 420, background: 'radial-gradient(circle, rgba(217,164,65,0.35) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 flex items-center gap-2.5">
          <BiatLogo size={34} radius={9} />
          <span className="font-serif text-[16px] font-semibold">Sinistres BIAT</span>
        </div>

        <div className="relative z-10 mt-9">
          <h1 className="font-serif text-[34px] font-semibold leading-[1.18] tracking-tight mb-2.5">
            Bon retour <span style={{ color: '#D9A441' }}>parmi nous</span>
          </h1>
          <p className="text-[13.5px] leading-relaxed max-w-[380px]" style={{ color: 'rgba(255,255,255,0.72)' }}>
            Reprenez le suivi de vos dossiers, explorez les signaux d&apos;analyse et pilotez le
            portefeuille sinistres avec l&apos;assistant intelligent integre.
          </p>
        </div>

        <div className="relative z-10 flex-1 flex items-center justify-center my-6">
          <LoginIllustration />
        </div>

        <div className="relative z-10 flex gap-3">
          <StatFrame value="13" label="Modules" />
          <StatFrame value={dossiersCount !== null ? dossiersCount.toLocaleString('fr-TN') : '—'} label="Dossiers" />
          <StatFrame value="2" label="Roles" />
        </div>
      </div>

      <div className="bg-panel flex items-center justify-center p-8 md:p-10">
        <div className="w-full max-w-[380px]">
          <h2 className="font-serif text-[28px] font-semibold text-text-primary tracking-tight mb-2">
            Connexion
          </h2>
          <p className="text-[13px] text-text-muted mb-7 font-sans">
            Accedez a votre espace de gestion des sinistres.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="username" className="block text-[11.5px] font-semibold uppercase tracking-wide text-text-muted mb-1.5">
                Nom d&apos;utilisateur
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint text-[13px]">&#9679;</span>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  className="input pl-9"
                />
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="block text-[11.5px] font-semibold uppercase tracking-wide text-text-muted mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint text-[13px]">&#128274;</span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input pl-9"
                />
              </div>
            </div>

            <div className="flex justify-end -mt-2 mb-5">
              <Link to="/mot-de-passe-oublie" className="text-[12px] font-semibold text-brand hover:text-brand-deep transition-colors">
                Mot de passe oublie ?
              </Link>
            </div>

            {error && (
              <p className="text-[12px] text-danger bg-status-critique-bg border border-danger/20 rounded-control px-3 py-2 mb-4">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-control font-bold text-[13.8px] text-white disabled:opacity-60 transition-all"
              style={{
                background: 'linear-gradient(120deg, #D9A441, #3E8A4C)',
                boxShadow: '0 12px 26px rgba(62,138,76,0.28)',
              }}
            >
              {loading ? 'Connexion...' : 'Acceder a la plateforme'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6 text-[11.5px] text-text-faint font-sans">
            <span className="flex-1 h-px bg-hairline" />
            connexion securisee
            <span className="flex-1 h-px bg-hairline" />
          </div>

          <div className="flex justify-center gap-5">
            <StatusRow ok label="Systeme operationnel" />
            <StatusRow ok={dbConnected} label={dbConnected === false ? 'Base indisponible' : 'Base connectee'} />
            <StatusRow ok label="IA active" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatFrame({ value, label }: { value: string; label: string }) {
  return (
    <div
      className="flex-1 rounded-control px-3.5 py-3"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.22)', backdropFilter: 'blur(6px)' }}
    >
      <div className="font-serif text-[21px] font-semibold" style={{ color: '#D9A441' }}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
        {label}
      </div>
    </div>
  );
}

function StatusRow({ ok, label }: { ok: boolean | null; label: string }) {
  const color = ok === false ? '#C85A42' : '#2E8A8F';
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-text-faint font-sans">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      {label}
    </div>
  );
}

function LoginIllustration() {
  return (
    <svg viewBox="0 0 420 340" className="w-full max-w-[400px]">
      <defs>
        <linearGradient id="loginDesk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8DC63F" />
          <stop offset="100%" stopColor="#3E8A4C" />
        </linearGradient>
        <linearGradient id="loginScreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F3E7C9" />
          <stop offset="100%" stopColor="#D9A441" />
        </linearGradient>
      </defs>

      <ellipse cx="210" cy="300" rx="170" ry="14" fill="#ffffff" opacity="0.06" />

      <rect x="70" y="220" width="280" height="14" rx="4" fill="url(#loginDesk)" />
      <rect x="90" y="234" width="14" height="60" fill="#2C5A34" />
      <rect x="316" y="234" width="14" height="60" fill="#2C5A34" />

      <rect x="140" y="120" width="140" height="94" rx="10" fill="#FFFFFF" />
      <rect x="150" y="130" width="120" height="74" rx="4" fill="url(#loginScreen)" />
      <polyline
        points="160,190 180,165 200,178 222,140 250,150"
        fill="none"
        stroke="#163D26"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="200" y="214" width="20" height="10" fill="#E9E4D4" />

      <circle cx="210" cy="80" r="24" fill="#F3E1C7" />
      <path d="M175 150 C175 115 245 115 245 150 L245 222 L175 222 Z" fill="#8DC63F" />
      <path d="M175 150 C175 115 245 115 245 150" fill="none" stroke="#3E8A4C" strokeWidth="3" />

      <g transform="translate(305,60)">
        <path d="M27 0 L52 9 V33 C52 52 27 66 27 66 C27 66 2 52 2 33 V9 Z" fill="#FFFFFF" stroke="#D9A441" strokeWidth="3" />
        <path d="M15 33 L24 42 L40 21" fill="none" stroke="#B27F2E" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      <g transform="translate(38,150)">
        <rect width="86" height="50" rx="9" fill="#FFFFFF" />
        <circle cx="18" cy="17" r="8" fill="#EAF3E3" />
        <path d="M14 17 L17 20 L23 12" stroke="#3E8A4C" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="32" y="12" width="42" height="6" rx="3" fill="#E3E8DC" />
        <circle cx="18" cy="34" r="8" fill="#FBF1DD" />
        <path d="M14 34 L17 37 L23 29" stroke="#B27F2E" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="32" y="30" width="30" height="6" rx="3" fill="#E3E8DC" />
      </g>
    </svg>
  );
}
