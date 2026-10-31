import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BiatLogo from './BiatLogo';

const navItems = [
  { to: '/dashboard', label: 'Tableau de bord', icon: 'grid' },
  { to: '/sinistres', label: 'Sinistres', icon: 'folder' },
  { to: '/scanner', label: 'Scanner', icon: 'scan' },
  { to: '/delais', label: 'Delais', icon: 'clock' },
  { to: '/financier', label: 'Financier', icon: 'coin' },
  { to: '/alertes', label: 'Alertes', icon: 'bell' },
  { to: '/anomalies', label: 'Anomalies', icon: 'alert' },
  { to: '/predictions', label: 'Predictions', icon: 'trend' },
  { to: '/process-mining', label: 'Process mining', icon: 'flow' },
  { to: '/previsions', label: 'Previsions', icon: 'bars' },
  { to: '/assistant', label: 'Assistant IA', icon: 'chat' },
  { to: '/calendrier', label: 'Calendrier de charge', icon: 'calendar' },
  { to: '/qualite-donnees', label: 'Qualite des donnees', icon: 'check' },
];

function initials(username: string | null): string {
  if (!username) return '?';
  return username.slice(0, 2).toUpperCase();
}

const ICONS: Record<string, string> = {
  grid: 'M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z',
  folder: 'M2.5 5.5a1 1 0 0 1 1-1h3.6l1.4 1.6h6a1 1 0 0 1 1 1v7.4a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1z',
  scan: 'M3 6V3.5h3M15 6V3.5h-3M3 12v2.5h3M15 12v2.5h-3M3 9h12',
  clock: 'M9 5v4l3 2M15 9a6 6 0 1 1-12 0 6 6 0 0 1 12 0z',
  coin: 'M9 9V4M6.5 6.2c0-1.2 1.1-2.2 2.5-2.2s2.5 1 2.5 2.2S10.7 8.3 9 8.3s-2.5 1-2.5 2.2S9 12.7 9 12.7c1.4 0 2.5-1 2.5-2.2M9 12.7v2.3',
  bell: 'M9 3a3.5 3.5 0 0 0-3.5 3.5v2.3L4 12h10l-1.5-3.2V6.5A3.5 3.5 0 0 0 9 3zM7.3 14.5a1.7 1.7 0 0 0 3.4 0',
  alert: 'M9 3.5 2.5 15h13z M9 7.5v3.2M9 12.8v.1',
  trend: 'M3 13.5 7 8.8 10 11.5 15 4.8M11 4.8h4v4',
  flow: 'M3.5 3.5h4v4h-4zM10.5 10.5h4v4h-4zM7.5 5.5h3.2M12.5 10.5V7.7a1 1 0 0 0-1-1H9',
  bars: 'M4 14.5V9M9 14.5V4.5M14 14.5V7.5',
  chat: 'M3 4h12v7.5H7.5L4 14.5v-3H3z',
  calendar: 'M3.5 4h11v10h-11zM3.5 7.2h11M6.3 3v2.2M11.7 3v2.2',
  check: 'M9 3 3.5 5.3v3.8c0 3 2.3 5.1 5.5 5.9 3.2-.8 5.5-2.9 5.5-5.9V5.3zM6.3 8.7l1.9 1.9 3.5-4',
};

function NavIcon({ name }: { name: string }) {
  const d = ICONS[name];
  if (!d) return null;
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d={d} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { username, role, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 bg-panel border-b border-hairline">
        <div className="max-w-content mx-auto px-5 h-[52px] flex items-center justify-between gap-3">
          <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
            <BiatLogo size={26} radius={8} />
            <span className="font-serif text-[14px] font-semibold text-text-primary tracking-tight whitespace-nowrap">
              Sinistres BIAT
            </span>
          </Link>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden 2xl:flex items-center gap-2 w-[170px] h-[32px] px-3 bg-panel-raised border border-hairline rounded-full">
              <span className="text-[11.5px] text-text-faint font-sans truncate">
                Rechercher&hellip;
              </span>
            </div>

            <div
              className="hidden xl:flex items-center gap-1.5 h-7 px-2.5 rounded-full"
              style={{ background: 'rgba(62,138,76,0.10)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-brand" />
              <span className="text-[10.5px] font-bold font-serif text-brand whitespace-nowrap">Base connectee</span>
            </div>

            <div className="relative group">
              <button className="flex items-center gap-2.5 py-1.5 pl-1.5 pr-2.5 rounded-full hover:bg-black/[0.04] transition-colors">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold font-serif shrink-0"
                  style={{ background: 'rgba(20,32,26,0.08)', color: '#5C6B60' }}
                >
                  {initials(username)}
                </span>
                <span className="hidden 2xl:flex flex-col items-start leading-tight">
                  <span className="text-[12px] font-semibold text-text-primary font-sans whitespace-nowrap">{username}</span>
                  <span className="text-[10px] text-text-faint font-sans whitespace-nowrap">
                    {role === 'ADMIN' ? 'Administrateur' : 'Gestionnaire'}
                  </span>
                </span>
              </button>
              <div className="absolute right-0 top-full pt-2 hidden group-hover:block group-focus-within:block z-40">
                <div className="bg-panel border border-hairline rounded-control shadow-lg py-1.5 min-w-[160px]">
                  <button
                    onClick={logout}
                    className="w-full text-left px-3.5 py-2 text-[12.5px] text-text-muted hover:text-danger hover:bg-black/[0.03] transition-colors"
                  >
                    Se deconnecter
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav className="max-w-content mx-auto px-5 pb-2 flex flex-wrap items-center gap-1">
          {navItems.map((item) => (
            <NavPill
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
              active={location.pathname.startsWith(item.to)}
            />
          ))}
        </nav>
      </header>

      <main className="min-w-0">{children}</main>
    </div>
  );
}

function NavPill({ to, label, icon, active }: { to: string; label: string; icon: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors shrink-0 ${
        active ? 'text-white' : 'text-text-muted hover:bg-black/[0.04] hover:text-text-primary'
      }`}
      style={active ? { background: '#1B4D2E' } : undefined}
    >
      <NavIcon name={icon} />
      {label}
    </Link>
  );
}
