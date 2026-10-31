import api from './api';

export interface DelaiStat {
  moyenne: number | null;
  mediane: number | null;
  minimum: number | null;
  maximum: number | null;
  nombreDossiers: number;
}

export interface DelaisStats {
  sinistreOuverture: DelaiStat;
  ouvertureOrdonnancement: DelaiStat;
  ordonnancementReglement: DelaiStat;
  ouvertureCloture: DelaiStat;
  seuilCritiqueClotureJours: number;
}

export interface SinistreDelai {
  id: number;
  codeSinistre: number;
  nSinistre: string;
  statut: 'OUVERT' | 'CLOTURE';
  sinistreOuvertureJours: number | null;
  ouvertureOrdonnancementJours: number | null;
  ordonnancementReglementJours: number | null;
  ouvertureClotureJours: number | null;
}

export interface SinistresDelaisPage {
  content: SinistreDelai[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export async function fetchDelaisStats(): Promise<DelaisStats> {
  const { data } = await api.get<DelaisStats>('/delais/stats');
  return data;
}

export async function fetchDossiersDelais(
  page: number,
  size: number,
  sortBy: string
): Promise<SinistresDelaisPage> {
  const { data } = await api.get<SinistresDelaisPage>('/delais/dossiers', {
    params: { page, size, sortBy },
  });
  return data;
}

export interface TrancheHistogramme {
  tranche: string;
  nombreDossiers: number;
}

export async function fetchHistogrammeCloture(): Promise<TrancheHistogramme[]> {
  const { data } = await api.get<TrancheHistogramme[]>('/delais/histogramme-cloture');
  return data;
}

export interface GestionnaireScore {
  gestionnaireId: number;
  nomComplet: string;
  nombreDossiers: number;
  scoreMoyen: number;
}

export async function fetchClassementGestionnaires(): Promise<GestionnaireScore[]> {
  const { data } = await api.get<GestionnaireScore[]>('/scores/gestionnaires');
  return data;
}

export async function exportDelaisPdf(): Promise<Blob> {
  const { data } = await api.get('/delais/export-pdf', { responseType: 'blob' });
  return data;
}
