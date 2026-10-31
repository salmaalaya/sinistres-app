import api from './api';

export interface RepartitionItem {
  label: string;
  value: number;
}

export interface DelaisMoyens {
  sinistreOuvertureJours: number | null;
  ouvertureOrdonnancementJours: number | null;
  ordonnancementReglementJours: number | null;
  ouvertureClotureJours: number | null;
  seuilCritiqueClotureJours: number;
}

export interface SinistreRecent {
  id: number;
  codeSinistre: number;
  nSinistre: string;
  natureSin: string;
  dateOuverture: string;
  statut: 'OUVERT' | 'CLOTURE';
  montantTotalRegle: number;
}

export interface DashboardKpis {
  totalSinistres: number;
  dossiersOuverts: number;
  dossiersClotures: number;
  pctCloture: number;
  montantTotalRegle: number;
  montantMoyenRegle: number;
  nombreDossiersExpress: number;
  dossiersCritiques: number;
  nombreAnomalies: number;
  delaisMoyens: DelaisMoyens;
  repartitionNature: RepartitionItem[];
  repartitionType: RepartitionItem[];
  repartitionProcessus: RepartitionItem[];
  dossiersRecents: SinistreRecent[];
}

export interface HealthScoreComposantes {
  cloture: number;
  delais: number;
  anomalies: number;
  critiques: number;
}

export interface HealthScoreResponse {
  score: number;
  composantes: HealthScoreComposantes;
}

export interface InsightResponse {
  texte: string | null;
}

export async function fetchDashboardKpis(): Promise<DashboardKpis> {
  const { data } = await api.get<DashboardKpis>('/dashboard/kpis');
  return data;
}

export async function exportDashboardPdf(): Promise<Blob> {
  const { data } = await api.get('/dashboard/export-pdf', { responseType: 'blob' });
  return data;
}

export async function fetchHealthScore(): Promise<HealthScoreResponse> {
  const { data } = await api.get<HealthScoreResponse>('/dashboard/health-score');
  return data;
}

export async function fetchInsight(): Promise<InsightResponse> {
  const { data } = await api.get<InsightResponse>('/dashboard/insight');
  return data;
}
