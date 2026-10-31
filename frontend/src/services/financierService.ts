import api from './api';

export interface EvolutionMensuelle {
  mois: string;
  montantTotal: number;
  nombreReglements: number;
}

export interface MontantRepartitionItem {
  label: string;
  montant: number;
}

export interface TopReglement {
  sinistreId: number;
  codeSinistre: number;
  nSinistre: string;
  montant: number;
  dateReglement: string;
}

export interface DashboardFinancier {
  evolutionMensuelle: EvolutionMensuelle[];
  repartitionMontantNature: MontantRepartitionItem[];
  repartitionMontantProcessus: MontantRepartitionItem[];
  topReglements: TopReglement[];
}

export async function fetchDashboardFinancier(): Promise<DashboardFinancier> {
  const { data } = await api.get<DashboardFinancier>('/dashboard/financier');
  return data;
}

export async function exportFinancierPdf(): Promise<Blob> {
  const { data } = await api.get('/dashboard/financier/export-pdf', { responseType: 'blob' });
  return data;
}
