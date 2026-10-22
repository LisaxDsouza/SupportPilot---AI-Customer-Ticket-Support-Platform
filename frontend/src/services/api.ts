import axios from 'axios';
import type { 
  Ticket, 
  TicketCreatePayload, 
  TicketResponseDetail, 
  ResponseApprovalPayload, 
  ResolvedSolutionItem 
} from '../types/ticket';
import type { AuthResponse, LoginPayload, RegisterPayload, User } from '../types/auth';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1',
  timeout: 10000,
});

// Set or clear the authorization header
export function setAuthToken(token: string | null) {
  if (token) {
    client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete client.defaults.headers.common['Authorization'];
  }
}

function messageFor(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    return new Error(error.response?.data?.detail ?? error.message ?? 'Unable to reach the SupportPilot API.');
  }
  return error instanceof Error ? error : new Error('An unexpected API error occurred.');
}

// ----------------- Auth APIs -----------------
export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  try {
    const res = await client.post<AuthResponse>('/auth/login', payload);
    setAuthToken(res.data.access_token);
    return res.data;
  } catch (error) {
    throw messageFor(error);
  }
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  try {
    const res = await client.post<AuthResponse>('/auth/register', payload);
    setAuthToken(res.data.access_token);
    return res.data;
  } catch (error) {
    throw messageFor(error);
  }
}

export async function fetchCurrentUser(): Promise<User> {
  try {
    return (await client.get<User>('/auth/me')).data;
  } catch (error) {
    throw messageFor(error);
  }
}

export async function verifyRoleFromDB(): Promise<{
  user_id: number;
  email: string;
  full_name: string;
  department: string;
  role: 'EMPLOYEE' | 'SUPPORT_ENGINEER' | 'ADMIN';
  allowed_routes: string[];
}> {
  try {
    return (await client.get('/auth/verify-role')).data;
  } catch (error) {
    throw messageFor(error);
  }
}


export async function fetchSystemUsers(roleFilter?: string): Promise<User[]> {
  try {
    const params = roleFilter ? { role_filter: roleFilter } : {};
    return (await client.get<User[]>('/auth/users', { params })).data;
  } catch (error) {
    throw messageFor(error);
  }
}

// ----------------- Ticket APIs -----------------
export async function fetchTickets(filters?: {
  requester_email?: string;
  assigned_to_email?: string;
  status_filter?: string;
}): Promise<Ticket[]> {
  try {
    return (await client.get<Ticket[]>('/tickets', { params: filters })).data;
  } catch (error) {
    throw messageFor(error);
  }
}

export async function createTicket(payload: TicketCreatePayload): Promise<Ticket> {
  try {
    return (await client.post<Ticket>('/tickets', payload)).data;
  } catch (error) {
    throw messageFor(error);
  }
}

export async function updateTicketStatus(
  ticketId: number,
  status: string,
  resolvedByEmail?: string,
): Promise<Ticket> {
  try {
    return (await client.patch<Ticket>(`/tickets/${ticketId}/status`, {
      status,
      resolved_by_email: resolvedByEmail,
    })).data;
  } catch (error) {
    throw messageFor(error);
  }
}

export async function assignTicket(ticketId: number, assignedToEmail: string): Promise<Ticket> {
  try {
    return (await client.patch<Ticket>(`/tickets/${ticketId}/assign`, {
      assigned_to_email: assignedToEmail,
    })).data;
  } catch (error) {
    throw messageFor(error);
  }
}

// ----------------- Resolution & AI Copilot APIs -----------------
export async function generateTicketResolution(ticketId: number): Promise<TicketResponseDetail> {
  try {
    return (await client.post<TicketResponseDetail>(`/tickets/${ticketId}/generate-resolution`)).data;
  } catch (error) {
    throw messageFor(error);
  }
}

export async function fetchTicketResponses(ticketId: number): Promise<TicketResponseDetail[]> {
  try {
    return (await client.get<TicketResponseDetail[]>(`/tickets/${ticketId}/responses`)).data;
  } catch (error) {
    throw messageFor(error);
  }
}

export async function approveTicketResponse(
  ticketId: number,
  responseId: number,
  payload: ResponseApprovalPayload
): Promise<TicketResponseDetail> {
  try {
    return (await client.post<TicketResponseDetail>(
      `/tickets/${ticketId}/responses/${responseId}/approve`,
      payload
    )).data;
  } catch (error) {
    throw messageFor(error);
  }
}

export async function fetchEmployeeResolvedSolutions(requesterEmail: string): Promise<ResolvedSolutionItem[]> {
  try {
    return (await client.get<ResolvedSolutionItem[]>('/tickets/employee/resolved-solutions', {
      params: { requester_email: requesterEmail },
    })).data;
  } catch (error) {
    throw messageFor(error);
  }
}

