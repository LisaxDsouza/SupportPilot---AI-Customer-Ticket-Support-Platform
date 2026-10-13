import type { Ticket } from '../types/ticket';
export default function ClassificationCard({ ticket }: { ticket: Ticket | null }) {
  if (!ticket) return null;
  return <section className="card classification"><h2>Classification result <small>{ticket.ticket_code}</small></h2><dl>
    <div><dt>Category</dt><dd>{ticket.category} · {ticket.sub_category}</dd></div><div><dt>Severity</dt><dd><span className={`badge severity-${ticket.severity}`}>{ticket.severity}</span></dd></div>
    <div><dt>Priority</dt><dd><span className="badge">{ticket.priority}</span></dd></div><div><dt>Confidence</dt><dd>{Math.round(ticket.confidence_score * 100)}%</dd></div>
    <div><dt>Assigned team</dt><dd>{ticket.assigned_team}</dd></div><div><dt>Status</dt><dd>{ticket.status}</dd></div>
  </dl>{ticket.ai_reasoning && <p className="muted">{ticket.ai_reasoning}</p>}</section>;
}
