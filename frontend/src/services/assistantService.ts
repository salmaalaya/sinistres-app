import api from './api';

export interface AssistantResult {
  value?: number | string | null;
  label?: string;
  columns?: string[];
  rows?: (string | number | null)[][];
}

export interface AssistantQueryResponse {
  answer: string;
  sql: string;
  resultType: 'scalar' | 'table';
  result: AssistantResult;
  conversationId: string;
}

export async function askAssistant(
  question: string,
  conversationId: string | null
): Promise<AssistantQueryResponse> {
  const { data } = await api.post<AssistantQueryResponse>('/assistant/query', {
    question,
    conversationId,
  });
  return data;
}
