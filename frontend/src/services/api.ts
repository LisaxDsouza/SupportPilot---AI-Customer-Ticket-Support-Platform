import axios from 'axios';
import type { Ticket, TicketCreatePayload } from '../types/ticket';
import type { Citation, TicketSummary } from '../types/resolution';

const client = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1', timeout: 8000 });

function messageFor(error: unknown): Error {
  if (axios.isAxiosError(error)) return new Error(error.response?.data?.detail ?? error.message ?? 'Unable to reach the SupportPilot API.');
  return error instanceof Error ? error : new Error('An unexpected API error occurred.');
}

export async function fetchTickets(): Promise<Ticket[]> {
  try { return (await client.get<Ticket[]>('/tickets')).data; } catch (error) { throw messageFor(error); }
}

export async function createTicket(payload: TicketCreatePayload): Promise<Ticket> {
  try { return (await client.post<Ticket>('/tickets', payload)).data; } catch (error) { throw messageFor(error); }
}

export async function fetchTicketSummary(ticketId: number): Promise<TicketSummary> {
  try { return (await client.post<TicketSummary>(`/tickets/${ticketId}/summarize`)).data; } catch (error) { throw messageFor(error); }
}

export async function searchKnowledge(query: string, category?: string): Promise<Citation[]> {
  try {
    return (await client.post<{ citations: Citation[] }>('/kb/search', {
      query,
      category,
      top_k: 4,
    })).data.citations;
  } catch (error) {
    throw messageFor(error);
  }
}
