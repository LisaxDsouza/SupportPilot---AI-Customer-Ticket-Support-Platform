import type { Ticket } from '../types/ticket';
export default function TicketTable({ tickets }: { tickets: Ticket[] }) {
  return <section className="card"><h2>Tickets</h2><div className="table-wrap"><table><thead><tr><th>Code</th><th>Title</th><th>Category</th><th>Severity</th><th>Priority</th><th>Status</th><th>Created</th></tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket.ticket_id}><td>{ticket.ticket_code}</td><td>{ticket.title}</td><td>{ticket.category}</td><td><span className={`badge severity-${ticket.severity}`}>{ticket.severity}</span></td><td>{ticket.priority}</td><td>{ticket.status}</td><td>{new Date(ticket.created_at).toLocaleString()}</td></tr>)}</tbody></table></div></section>;
}
