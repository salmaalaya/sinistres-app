import api from './api';
import type { PageResponse, Sinistre, SinistreFilters, SinistreFormValues } from '../types';

export async function fetchSinistres(
  filters: SinistreFilters,
  page: number,
  size: number
): Promise<PageResponse<Sinistre>> {
  const params: Record<string, string | number> = { page, size };
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params[key] = value;
    }
  });

  const { data } = await api.get<PageResponse<Sinistre>>('/sinistres', { params });
  return data;
}

export async function fetchSinistreById(id: number): Promise<Sinistre> {
  const { data } = await api.get<Sinistre>(`/sinistres/${id}`);
  return data;
}

function toPayload(values: SinistreFormValues) {
  return {
    codeSinistre: Number(values.codeSinistre),
    nSinistre: values.nSinistre,
    dateSinistre: values.dateSinistre,
    dateOuverture: values.dateOuverture,
    dateClotureSinistre: values.dateClotureSinistre || null,
    natureSin: values.natureSin,
    typeSin: values.typeSin,
    dateRetourQuittanceSigne: values.dateRetourQuittanceSigne || null,
    dateOrdonnancement: values.dateOrdonnancement,
    processus: values.processus || undefined,
  };
}

export async function createSinistre(values: SinistreFormValues): Promise<Sinistre> {
  const { data } = await api.post<Sinistre>('/sinistres', toPayload(values));
  return data;
}

export async function updateSinistre(id: number, values: SinistreFormValues): Promise<Sinistre> {
  const { data } = await api.put<Sinistre>(`/sinistres/${id}`, toPayload(values));
  return data;
}

export async function deleteSinistre(id: number): Promise<void> {
  await api.delete(`/sinistres/${id}`);
}

export async function exportSinistrePdf(id: number): Promise<Blob> {
  const { data } = await api.get(`/sinistres/${id}/export-pdf`, { responseType: 'blob' });
  return data;
}
