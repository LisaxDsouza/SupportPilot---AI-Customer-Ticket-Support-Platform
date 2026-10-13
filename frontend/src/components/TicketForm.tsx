import { FormEvent, useState } from 'react';
import { createTicket } from '../services/api';
import type { Ticket, TicketCreatePayload } from '../types/ticket';

const sources = ['WEB_PORTAL', 'EMAIL', 'API', 'SLACK_BOT'];
type Props = { onTicketCreated: (ticket: Ticket) => void };

export default function TicketForm({ onTicketCreated }: Props) {
  const [form, setForm] = useState<TicketCreatePayload>({ title: '', description: '', requester_email: '', department: 'Engineering', source: 'WEB_PORTAL' });
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const update = (field: keyof TicketCreatePayload, value: string) => setForm((old) => ({ ...old, [field]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (form.title.trim().length < 5 || form.description.trim().length < 10) { setError('Use at least 5 title characters and 10 description characters.'); return; }
    setLoading(true);
    try { const ticket = await createTicket(form); onTicketCreated(ticket); setForm((old) => ({ ...old, title: '', description: '' })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Ticket submission failed.'); }
    finally { setLoading(false); }
  }
  return <form className="card form" onSubmit={submit} noValidate><h2>Submit an IT ticket</h2>
    <label>Title<input value={form.title} onChange={(e) => update('title', e.target.value)} minLength={5} maxLength={200} required /></label>
    <label>Description<textarea value={form.description} onChange={(e) => update('description', e.target.value)} minLength={10} required rows={5} /></label>
    <label>Work email<input type="email" value={form.requester_email} onChange={(e) => update('requester_email', e.target.value)} required /></label>
    <div className="two-col"><label>Department<input value={form.department} onChange={(e) => update('department', e.target.value)} required /></label>
    <label>Source<select value={form.source} onChange={(e) => update('source', e.target.value)}>{sources.map((source) => <option key={source}>{source}</option>)}</select></label></div>
    {error && <p className="error" role="alert">{error}</p>}<button disabled={loading}>{loading ? 'Submitting…' : 'Submit ticket'}</button>
  </form>;
}
