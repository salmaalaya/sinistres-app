import api from './api';

export interface ModeleMetrics {
  mae: number;
  rmse: number;
  r2: number;
}

export interface ComparaisonModeles {
  resultats: Record<string, ModeleMetrics>;
  meilleurModele: string;
  nombreDossiersEntrainement: number;
}

export interface DureePredictionRequest {
  natureSin: string;
  typeSin: string;
  processus: string;
  montantEstime: number;
  dateOuverture: string;
}

export interface FacteurExplicatif {
  feature: string;
  importancePct: number;
}

export interface DossierSimilaire {
  id: number;
  codeSinistre: number;
  nSinistre: string;
  natureSin: string;
  typeSin: string;
  processus: string;
  montantTotalRegle: number;
  dureeJours: number;
  dateClotureSinistre: string;
  similaritePct: number;
}

export interface DureePredictionResponse {
  joursEstimes: number;
  modeleUtilise: string;
  facteursExplicatifs: FacteurExplicatif[];
  dossiersSimilaires: DossierSimilaire[];
}

export interface MontantPredictionRequest {
  natureSin: string;
  typeSin: string;
  processus: string;
  sinistreOuvertureJours: number;
  ouvertureOrdonnancementJours: number;
}

export interface MontantPredictionResponse {
  montantEstime: number;
  modeleUtilise: string;
  facteursExplicatifs: FacteurExplicatif[];
  dossiersSimilaires: DossierSimilaire[];
}

export async function fetchDureeMetrics(): Promise<ComparaisonModeles> {
  const { data } = await api.get<ComparaisonModeles>('/predictions/duree/metrics');
  return data;
}

export async function predictDuree(payload: DureePredictionRequest): Promise<DureePredictionResponse> {
  const { data } = await api.post<DureePredictionResponse>('/predictions/duree/predict', payload);
  return data;
}

export async function fetchMontantMetrics(): Promise<ComparaisonModeles> {
  const { data } = await api.get<ComparaisonModeles>('/predictions/montant/metrics');
  return data;
}

export async function predictMontant(payload: MontantPredictionRequest): Promise<MontantPredictionResponse> {
  const { data } = await api.post<MontantPredictionResponse>('/predictions/montant/predict', payload);
  return data;
}
