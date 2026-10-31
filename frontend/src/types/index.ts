export type Role = 'ADMIN' | 'GESTIONNAIRE';

export interface AuthResponse {
  token: string;
  username: string;
  role: Role;
  aVuBriefing: boolean;
}

export interface Reglement {
  id: number;
  montantReglement: number;
  dateReglement: string; // ISO date
}

export interface Sinistre {
  id: number;
  codeSinistre: number;
  nSinistre: string;
  dateSinistre: string;
  dateOuverture: string;
  dateClotureSinistre: string | null;
  natureSin: string;
  typeSin: string;
  dateRetourQuittanceSigne: string | null;
  dateOrdonnancement: string;
  processus: string;
  statut: 'OUVERT' | 'CLOTURE';
  montantTotalRegle: number;
  gestionnaireNomComplet: string | null;
  reglements: Reglement[];
}

export interface SinistreFormValues {
  codeSinistre: number | '';
  nSinistre: string;
  dateSinistre: string;
  dateOuverture: string;
  dateClotureSinistre: string;
  natureSin: string;
  typeSin: string;
  dateRetourQuittanceSigne: string;
  dateOrdonnancement: string;
  processus: string;
}

export interface SinistreFilters {
  nature?: string;
  type?: string;
  processus?: string;
  statut?: string;
  dateOuvertureDebut?: string;
  dateOuvertureFin?: string;
  montantMin?: number;
  montantMax?: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // current page (0-indexed)
  size: number;
}

export interface ApiError {
  timestamp: string;
  status: number;
  message: string;
  fieldErrors?: Record<string, string>;
}
