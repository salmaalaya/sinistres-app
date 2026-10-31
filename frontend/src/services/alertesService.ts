import api from './api';

export interface AlerteMotif {
  code: string;
  texte: string;
}

export interface DossierAlerte {
  id: number;
  codeSinistre: number;
  nSinistre: string;
  statut: 'OUVERT' | 'CLOTURE';
  dateOuverture: string;
  joursOuverture: number;
  motifs: AlerteMotif[];
}

export interface AlertesPage {
  content: DossierAlerte[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  seuilJours: number;
  reglesActives: string[];
}

export async function fetchAlertes(
  page: number,
  size: number,
  seuilJours: number,
  regles: string[]
): Promise<AlertesPage> {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('size', String(size));
  params.set('seuilJours', String(seuilJours));
  regles.forEach((r) => params.append('regles', r));
  const { data } = await api.get<AlertesPage>(`/alertes?${params.toString()}`);
  return data;
}
