import api from './api';

export interface AnomalieDossier {
  id: number;
  codeSinistre: number;
  nSinistre: string;
  statut: 'OUVERT' | 'CLOTURE';
  montantTotalRegle: number;
  scoreAnomalie: number;
  raisons: string[];
}

export interface AnomaliesPage {
  content: AnomalieDossier[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  contamination: number;
  nombreDossiersAnalyses: number;
}

export async function fetchAnomalies(
  page: number,
  size: number,
  contamination: number
): Promise<AnomaliesPage> {
  const { data } = await api.get<AnomaliesPage>('/anomalies', {
    params: { page, size, contamination },
  });
  return data;
}
