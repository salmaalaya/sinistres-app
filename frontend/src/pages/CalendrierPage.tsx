import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { fetchAnneesDisponibles, fetchHeatmap, type CalendrierResponse, type JourActivite } from '../services/calendrierService';

const JOURS_LABEL = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MOIS_LABEL = [
  'Janv', 'Fevr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sept', 'Oct', 'Nov', 'Dec',
];

function buildWeeks(jours: JourActivite[]): (JourActivite | null)[][] {
  if (jours.length === 0) return [];
  const firstDate = new Date(jours[0].date + 'T00:00:00');
  const startPad = firstDate.getDay();
  const cells: (JourActivite | null)[] = [...Array(startPad).fill(null), ...jours];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (JourActivite | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function colorFor(count: number, max: number): string {
  if (count === 0) return 'rgba(18,38,26,0.05)';
  const ratio = max > 0 ? count / max : 0;
  if (ratio > 0.75) return '#8DC63F';
  if (ratio > 0.5) return '#3E8A4C';
  if (ratio > 0.25) return '#2C6539';
  return '#1B4D2E';
}

function monthLabelForWeek(week: (JourActivite | null)[]): string | null {
  const firstOfMonth = week.find((d) => d !== null && new Date(d.date + 'T00:00:00').getDate() === 1);
  if (!firstOfMonth) return null;
  return MOIS_LABEL[new Date(firstOfMonth.date + 'T00:00:00').getMonth()];
}

function formatDateLong(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function CalendrierPage() {
  const [type, setType] = useState<'ouvertures' | 'clotures'>('ouvertures');
  const [annees, setAnnees] = useState<number[]>([]);
  const [annee, setAnnee] = useState<number | null>(null);
  const [data, setData] = useState<CalendrierResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<JourActivite | null>(null);

  useEffect(() => {
    fetchAnneesDisponibles()
      .then((years) => {
        setAnnees(years);
        if (years.length > 0) setAnnee(years[years.length - 1]);
      })
      .catch(() => setError('Impossible de charger les annees disponibles.'));
  }, []);

  useEffect(() => {
    if (annee === null) return;
    fetchHeatmap(type, annee)
      .then(setData)
      .catch(() => setError('Impossible de charger le calendrier de charge.'));
  }, [type, annee]);

  const weeks = data ? buildWeeks(data.jours) : [];
  const max = data ? Math.max(...data.jours.map((j) => j.count), 1) : 1;

  return (
    <Layout>
      <div className="max-w-content mx-auto px-9 py-7">
        <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-serif text-[25px] font-semibold text-text-primary tracking-tight">Calendrier de charge</h2>
            <p className="text-text-muted text-[13px] mt-1 font-sans">
              Repartition quotidienne des ouvertures et clotures de dossiers, style contributions.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex bg-panel border border-hairline rounded-control overflow-hidden">
              {(['ouvertures', 'clotures'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-4 py-2 text-[12.5px] font-semibold transition-colors capitalize ${
                    type === t ? 'text-canvas-deep' : 'text-text-muted hover:text-text-primary'
                  }`}
                  style={type === t ? { background: 'linear-gradient(135deg, #8DC63F, #3E8A4C)' } : undefined}
                >
                  {t === 'ouvertures' ? 'Ouvertures' : 'Clotures'}
                </button>
              ))}
            </div>
            {annees.length > 0 && (
              <select
                value={annee ?? ''}
                onChange={(e) => setAnnee(Number(e.target.value))}
                className="text-sm border border-hairline rounded-control px-3 py-2 bg-black/[0.03] text-text-primary focus:outline-none focus:border-brand"
              >
                {annees.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-danger bg-status-critique-bg border border-danger/20 rounded-control px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {data && (
          <>
            <div className="bg-panel rounded-card border border-hairline flex flex-wrap divide-x divide-hairline mb-6">
              <div className="flex-1 min-w-[170px] px-5 py-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">Jour le plus charge</p>
                <p className="font-serif text-[22px] font-semibold text-text-primary mt-2.5 leading-none">
                  {data.kpis.jourLePlusCharge ? `${data.kpis.jourLePlusCharge.count} evenements` : '-'}
                </p>
                {data.kpis.jourLePlusCharge && (
                  <p className="text-[11px] text-text-faint mt-1.5 font-sans capitalize">
                    {formatDateLong(data.kpis.jourLePlusCharge.date)}
                  </p>
                )}
              </div>
              <div className="flex-1 min-w-[150px] px-5 py-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">Moyenne journaliere</p>
                <p className="font-serif text-[22px] font-semibold text-text-primary mt-2.5 leading-none">{data.kpis.moyenneJournaliere}</p>
              </div>
              <div className="flex-1 min-w-[150px] px-5 py-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">Jours sans activite</p>
                <p className="font-serif text-[22px] font-semibold text-text-primary mt-2.5 leading-none">{data.kpis.joursSansActivite}</p>
              </div>
              <div className="flex-1 min-w-[150px] px-5 py-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">Jours actifs</p>
                <p className="font-serif text-[22px] font-semibold text-text-primary mt-2.5 leading-none">{data.kpis.joursActifs}</p>
              </div>
              <div className="flex-1 min-w-[150px] px-5 py-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-text-muted">Total evenements</p>
                <p className="font-serif text-[22px] font-semibold text-text-primary mt-2.5 leading-none">{data.kpis.totalEvenements}</p>
              </div>
            </div>

            <div className="bg-panel border border-hairline rounded-card p-5 overflow-x-auto">
              <div className="flex gap-[3px]" style={{ minWidth: weeks.length * 13 + 30 }}>
                <div className="flex flex-col gap-[3px] mr-1.5 pt-[18px]">
                  {JOURS_LABEL.map((label, i) => (
                    <div key={label} className="h-[11px] text-[9px] text-text-faint font-sans leading-[11px]">
                      {i % 2 === 1 ? label : ''}
                    </div>
                  ))}
                </div>
                <div className="flex gap-[3px]">
                  {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-[3px]">
                      <div className="h-[14px] text-[9.5px] text-text-faint font-sans whitespace-nowrap">
                        {monthLabelForWeek(week) ?? ''}
                      </div>
                      {week.map((day, di) => (
                        <div
                          key={di}
                          onMouseEnter={() => day && setHovered(day)}
                          onMouseLeave={() => setHovered(null)}
                          className="w-[11px] h-[11px] rounded-[2px] cursor-default transition-transform hover:scale-125"
                          style={{ background: day ? colorFor(day.count, max) : 'transparent' }}
                          title={day ? `${formatDateLong(day.date)} : ${day.count} evenement(s)` : undefined}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-hairline">
                <p className="text-[11.5px] text-text-muted font-sans">
                  {hovered ? (
                    <>
                      <span className="text-text-primary font-medium capitalize">{formatDateLong(hovered.date)}</span>
                      {' — '}
                      {hovered.count} evenement{hovered.count !== 1 ? 's' : ''}
                    </>
                  ) : (
                    'Survolez une case pour voir le detail du jour.'
                  )}
                </p>
                <div className="flex items-center gap-1.5 text-[10.5px] text-text-faint font-sans">
                  Moins
                  {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
                    <span
                      key={i}
                      className="w-[11px] h-[11px] rounded-[2px]"
                      style={{ background: colorFor(r === 0 ? 0 : Math.ceil(r * max), max) }}
                    />
                  ))}
                  Plus
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
