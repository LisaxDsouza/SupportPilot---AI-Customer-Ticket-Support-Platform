import { useEffect, useState } from 'react';
import ClassificationCard from './components/ClassificationCard';
import TicketForm from './components/TicketForm';
import TicketTable from './components/TicketTable';
import { fetchTickets } from './services/api';
import type { Ticket } from './types/ticket';

const mockTickets: Ticket[] = [{ ticket_id: 0, ticket_code: 'SP-DEMO', requester_email: 'demo@company.com', department: 'Engineering', title: 'Demo VPN connection issue', description: 'Mock ticket shown while the API is unavailable.', category: 'VPN Access', sub_category: 'Connection Timeout', severity: 'Medium', priority: 'P3', confidence_score: 0, ai_reasoning: 'Mock data only — start the backend to view live tickets.', status: 'OPEN', source: 'WEB_PORTAL', assigned_team: 'IT_SERVICE_DESK', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }];

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>([]); const [latest, setLatest] = useState<Ticket | null>(null); const [usingMock, setUsingMock] = useState(false);
  useEffect(() => { fetchTickets().then((items) => { setTickets(items); setUsingMock(false); }).catch(() => { setTickets(mockTickets); setUsingMock(true); }); }, []);
  function onCreated(ticket: Ticket) { setLatest(ticket); setTickets((items) => [ticket, ...items.filter((item) => item.ticket_id !== 0)]); setUsingMock(false); }
  return <main><header><p className="eyebrow">AI ticket resolution agent</p><h1>SupportPilot</h1><p>Capture, triage, and track IT support requests.</p></header>
    {usingMock && <p className="notice" role="status">Mock data is displayed because the backend is unavailable. Start the API to submit live tickets.</p>}
    <div className="layout"><div><TicketForm onTicketCreated={onCreated} /><ClassificationCard ticket={latest} /></div><TicketTable tickets={tickets} /></div>
  </main>;
}
