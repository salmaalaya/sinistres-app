import api from './api';

export interface ChampsExtraits {
  nSinistre: string | null;
  dateSinistre: string | null;
  natureSin: string | null;
  montantReclame: string | null;
  description: string | null;
}

export interface OcrResponse {
  nomFichier: string;
  champs: ChampsExtraits;
  tauxExtraction: number;
}

export async function scanDocument(file: File): Promise<OcrResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<OcrResponse>('/ocr/scan', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function fetchSampleList(): Promise<string[]> {
  const { data } = await api.get<string[]>('/ocr/samples');
  return data;
}

export async function fetchSampleFile(filename: string): Promise<File> {
  const { data } = await api.get(`/ocr/samples/${filename}`, { responseType: 'blob' });
  return new File([data], filename, { type: 'image/png' });
}
