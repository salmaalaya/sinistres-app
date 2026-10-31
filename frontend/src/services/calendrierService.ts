import api from './api';

export interface JourActivite {
  date: string;
  count: number;
}

export interface JourLePlusCharge {
  date: string;
  count: number;
}

export interface CalendrierKpis {
  jourLePlusCharge: JourLePlusCharge | null;
  moyenneJournaliere: number;
  joursSansActivite: number;
  joursActifs: number;
  totalEvenements: number;
}

export interface CalendrierResponse {
  jours: JourActivite[];
  kpis: CalendrierKpis;
}

export async function fetchAnneesDisponibles(): Promise<number[]> {
  const { data } = await api.get<number[]>('/calendrier/annees');
  return data;
}

export async function fetchHeatmap(type: 'ouvertures' | 'clotures', annee: number): Promise<CalendrierResponse> {
  const { data } = await api.get<CalendrierResponse>('/calendrier/heatmap', { params: { type, annee } });
  return data;
}
