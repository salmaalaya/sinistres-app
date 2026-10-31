import api from './api';

export interface DernierImport {
  nomFichier: string;
  dateImport: string;
  lignesTraitees: number;
  lignesDedupliquees: number;
  lignesReglements: number;
  processusDefaults: number;
  montantsCorriges: number;
}

export interface CompletudeChamp {
  champ: string;
  pctComplet: number;
}

export interface QualiteDonnees {
  dernierImport: DernierImport | null;
  completude: CompletudeChamp[];
  totalSinistres: number;
  totalReglements: number;
}

export async function fetchQualiteDonnees(): Promise<QualiteDonnees> {
  const { data } = await api.get<QualiteDonnees>('/qualite');
  return data;
}
