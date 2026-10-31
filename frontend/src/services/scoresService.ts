import api from './api';

export interface ScoreDossier {
  id: number;
  codeSinistre: number;
  nSinistre: string;
  statut: 'OUVERT' | 'CLOTURE';
  score: number;
  classement: 'Excellent' | 'Bon' | 'Moyen' | 'Critique';
}

export interface ScoresPage {
  content: ScoreDossier[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ScoresDistribution {
  excellent: number;
  bon: number;
  moyen: number;
  critique: number;
  scoreMoyen: number;
}

export async function fetchScoresPage(page: number, size: number, sortDesc: boolean): Promise<ScoresPage> {
  const { data } = await api.get<ScoresPage>('/scores/dossiers', { params: { page, size, sortDesc } });
  return data;
}

export async function fetchScoresStats(): Promise<ScoresDistribution> {
  const { data } = await api.get<ScoresDistribution>('/scores/stats');
  return data;
}
