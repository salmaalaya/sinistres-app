import api from './api';

export interface BriefingResponse {
  prenom: string;
  dossiersActifs: number;
  dossiersCritiques: number;
  dossiersApprochantSeuil: number;
  expositionTotale: number;
  anomaliesDetectees: number;
  champsIncomplets: number;
  seuilJours: number;
}

export async function fetchBriefing(): Promise<BriefingResponse> {
  const { data } = await api.get<BriefingResponse>('/briefing');
  return data;
}

export async function markBriefingSeen(): Promise<void> {
  await api.post('/briefing/vu');
}
