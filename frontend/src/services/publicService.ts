import api from './api';

export interface PublicStats {
  totalDossiers: number;
  pctCloture: number;
  montantTotalRegle: number;
}

export async function fetchPublicStats(): Promise<PublicStats> {
  const { data } = await api.get<PublicStats>('/public/stats');
  return data;
}
