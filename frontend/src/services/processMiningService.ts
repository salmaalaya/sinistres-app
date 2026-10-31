import api from './api';

export interface TransitionProcessus {
  source: string;
  cible: string;
  frequence: number;
  dureeMoyenneJours: number;
  goulet: boolean;
}

export interface ProcessMiningResponse {
  etapes: string[];
  transitions: TransitionProcessus[];
  etapeLaPlusLente: string;
  nombreDossiersAnalyses: number;
}

export async function fetchProcessMining(): Promise<ProcessMiningResponse> {
  const { data } = await api.get<ProcessMiningResponse>('/process-mining');
  return data;
}
