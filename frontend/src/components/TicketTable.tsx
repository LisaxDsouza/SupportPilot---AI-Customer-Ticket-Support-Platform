import { useState } from 'react';
import KnowledgeSearchModal from './KnowledgeSearchModal';
import SummaryCard from './SummaryCard';
import type { Ticket } from '../types/ticket';

export default function TicketTable({ tickets }: { tickets: Ticket[] }) {
  const [knowledgeSearchOpen, setKnowledgeSearchOpen] = useState(false);
  return <section className="card"><div className="section-heading"><h2>Tickets</h2></div><div className="table-wrap"><table><thead><tr><th>Code</th><th>Title</th><th>Category</th><th>Severity</th><th>Priority</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket.ticket_id}><td>{ticket.ticket_code}</td><td>{ticket.title}</td><td>{ticket.category}</td><td><span className={`badge severity-${ticket.severity}`}>{ticket.severity}</span></td><td>{ticket.priority}</td><td>{ticket.status}</td><td>{new Date(ticket.created_at).toLocaleString()}</td><td className="ticket-actions"><SummaryCard ticketId={ticket.ticket_id} /><button className="btn-secondary btn-sm" onClick={() => setKnowledgeSearchOpen(true)}>📖 Runbooks</button></td></tr>)}</tbody></table></div>{knowledgeSearchOpen && <KnowledgeSearchModal onClose={() => setKnowledgeSearchOpen(false)} />}</section>;
}
