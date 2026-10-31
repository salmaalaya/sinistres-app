import api from './api';

export interface PointPrevision {
  mois: string;
  valeur: number;
  borneBasse: number | null;
  borneHaute: number | null;
  type: 'historique' | 'backtest' | 'prevision';
}

export interface SeriePrevision {
  points: PointPrevision[];
  modele: string;
  mapeBacktest: number | null;
  nombreMoisHistorique: number;
  instable: boolean;
  messageInstabilite: string | null;
}

export interface PrevisionsResponse {
  nombreSinistres: SeriePrevision;
  montantTotal: SeriePrevision;
}

export async function fetchPrevisions(): Promise<PrevisionsResponse> {
  const { data } = await api.get<PrevisionsResponse>('/previsions');
  return data;
}
