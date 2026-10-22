import { useState } from 'react';
import { fetchTicketSummary } from '../services/api';
import type { TicketSummary } from '../types/resolution';

interface Props {
  ticketId: number;
  initialSummary?: TicketSummary;
}

export default function SummaryCard({ ticketId, initialSummary }: Props) {
  const [summary, setSummary] = useState<TicketSummary | undefined>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(Boolean(initialSummary));
  const [error, setError] = useState('');

  async function handleSummarize() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchTicketSummary(ticketId);
      setSummary(data);
      setExpanded(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Failed to generate summary.');
    } finally {
      setLoading(false);
    }
  }

  if (!summary) {
    return (
      <span className="summary-action">
        <button className="btn-secondary btn-sm" onClick={handleSummarize} disabled={loading}>
          {loading ? 'Analyzing...' : '⚡ 30s AI Briefing'}
        </button>
        {error && <span className="inline-error" role="alert">{error}</span>}
      </span>
    );
  }

  return (
    <div className="summary-card">
      <button className="summary-header" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
        <span className="summary-badge">AI Briefing</span>
        <span className="summary-exec">{summary.executive_summary}</span>
        <span className="btn-toggle" aria-hidden="true">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="summary-body">
          <div className="summary-section">
            <strong>Key Symptoms:</strong>
            <ul>{summary.key_symptoms.map((symptom, index) => <li key={index}>{symptom}</li>)}</ul>
          </div>
          {summary.troubleshooting_attempted.length > 0 && (
            <div className="summary-section">
              <strong>User Attempted:</strong>
              <ul>{summary.troubleshooting_attempted.map((attempt, index) => <li key={index}>{attempt}</li>)}</ul>
            </div>
          )}
          <div className="summary-section"><strong>Business Impact:</strong> {summary.business_impact}</div>
          <div className="summary-section alert-action">
            <strong>Recommended Step:</strong> {summary.recommended_immediate_action}
          </div>
        </div>
      )}
    </div>
  );
}
