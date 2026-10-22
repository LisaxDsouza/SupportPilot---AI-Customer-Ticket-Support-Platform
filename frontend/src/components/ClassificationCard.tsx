import React from 'react';
import type { Ticket, Category, Severity, Priority } from '../types/ticket';

interface ClassificationCardProps {
  ticket?: Ticket | null;
  ticketCode?: string;
  category?: Category | string;
  subCategory?: string;
  severity?: Severity | string;
  priority?: Priority | string;
  confidenceScore?: number;
  suggestedTeam?: string;
  reasoning?: string;
}

export const ClassificationCard: React.FC<ClassificationCardProps> = ({
  ticket,
  ticketCode,
  category,
  subCategory,
  severity,
  priority,
  confidenceScore,
  suggestedTeam,
  reasoning,
}) => {
  const code = ticket?.ticket_code ?? ticketCode;
  const cat = ticket?.category ?? category ?? 'Unassigned';
  const sub = ticket?.sub_category ?? subCategory ?? 'General';
  const sev = ticket?.severity ?? severity ?? 'Medium';
  const prio = ticket?.priority ?? priority ?? 'P3';
  const score = ticket?.confidence_score ?? confidenceScore ?? 0.0;
  const team = ticket?.assigned_team ?? suggestedTeam ?? 'IT Helpdesk';
  const reason = ticket?.ai_reasoning ?? reasoning;

  if (!code && !ticket) return null;

  return (
    <section className="card classification">
      <h2>
        AI Classification Result <small>{code}</small>
      </h2>
      <dl>
        <div>
          <dt>Category</dt>
          <dd>{cat} · {sub}</dd>
        </div>
        <div>
          <dt>Severity</dt>
          <dd>
            <span className={`badge severity-${String(sev).toLowerCase()}`}>{sev}</span>
          </dd>
        </div>
        <div>
          <dt>Priority</dt>
          <dd>
            <span className={`badge priority-${String(prio).toLowerCase()}`}>{prio}</span>
          </dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd>{Math.round(score * 100)}%</dd>
        </div>
        <div>
          <dt>Assigned Team</dt>
          <dd>{team}</dd>
        </div>
      </dl>
      {reason && <p className="muted">{reason}</p>}
    </section>
  );
};

export default ClassificationCard;
