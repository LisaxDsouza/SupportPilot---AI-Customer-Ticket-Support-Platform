import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createTicket, fetchTickets, fetchEmployeeResolvedSolutions } from '../../services/api';
import type { Ticket, ResolvedSolutionItem } from '../../types/ticket';
import { ClassificationCard } from '../ClassificationCard';

interface EmployeePortalProps {
  activeTab?: 'web' | 'email' | 'history' | 'resolutions';
  onTabChange?: (tab: 'web' | 'email' | 'history' | 'resolutions') => void;
}

export const EmployeePortal: React.FC<EmployeePortalProps> = ({
  activeTab: propTab,
  onTabChange,
}) => {
  const { user } = useAuth();
  const [localTab, setLocalTab] = useState<'web' | 'email' | 'history' | 'resolutions'>('web');
  const activeTab = propTab ?? localTab;
  const setActiveTab = onTabChange ?? setLocalTab;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [latestTicket, setLatestTicket] = useState<Ticket | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // IT Resolutions State
  const [resolvedSolutions, setResolvedSolutions] = useState<ResolvedSolutionItem[]>([]);
  const [loadingSolutions, setLoadingSolutions] = useState(false);
  const [solutionSearch, setSolutionSearch] = useState('');
  const [feedbackState, setFeedbackState] = useState<Record<number, 'yes' | 'no'>>({});



  // Web Form State
  const [webTitle, setWebTitle] = useState('');
  const [webDescription, setWebDescription] = useState('');

  // Email Simulator State
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  useEffect(() => {
    loadUserTickets();
    if (user?.email) {
      loadResolvedSolutions();
    }
  }, [user?.email, activeTab]);

  const loadResolvedSolutions = async () => {
    if (!user) return;
    setLoadingSolutions(true);
    try {
      const data = await fetchEmployeeResolvedSolutions(user.email);
      setResolvedSolutions(data);
    } catch (err) {
      console.error('Failed to load resolved solutions', err);
    } finally {
      setLoadingSolutions(false);
    }
  };

  const handleFeedback = (ticketId: number, helpful: 'yes' | 'no') => {
    setFeedbackState((prev) => ({ ...prev, [ticketId]: helpful }));
  };

  const filteredSolutions = resolvedSolutions.filter((s) => {
    const q = solutionSearch.toLowerCase();
    return (
      s.ticket_code.toLowerCase().includes(q) ||
      s.title.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.solution_text.toLowerCase().includes(q) ||
      (s.resolved_by_email && s.resolved_by_email.toLowerCase().includes(q))
    );
  });

  const loadUserTickets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchTickets({ requester_email: user.email });
      setTickets(data);
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWebSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !webTitle.trim() || !webDescription.trim()) return;

    setSubmitting(true);
    setSuccessMessage(null);
    try {
      const ticket = await createTicket({
        title: webTitle.trim(),
        description: webDescription.trim(),
        requester_email: user.email,
        department: user.department,
        source: 'WEB_PORTAL',
      });
      setLatestTicket(ticket);
      setWebTitle('');
      setWebDescription('');
      setSuccessMessage(`Ticket #${ticket.ticket_code} submitted successfully via Web Portal!`);
      loadUserTickets();
    } catch (err: any) {
      alert(err.message || 'Error submitting ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !emailSubject.trim() || !emailBody.trim()) return;

    setSubmitting(true);
    setSuccessMessage(null);
    try {
      const ticket = await createTicket({
        title: emailSubject.trim(),
        description: emailBody.trim(),
        requester_email: user.email,
        department: user.department,
        source: 'EMAIL',
      });
      setLatestTicket(ticket);
      setEmailSubject('');
      setEmailBody('');
      setSuccessMessage(`Inbound email ingested! Ticket #${ticket.ticket_code} created and routed to IT.`);
      loadUserTickets();
    } catch (err: any) {
      alert(err.message || 'Error sending email ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="portal-container">
      <div className="portal-header">
        <div>
          <h2>Employee IT Helpdesk Portal</h2>
          <p>Welcome back, <strong>{user?.full_name}</strong> ({user?.department}) · Logged in as <code>{user?.email}</code></p>
        </div>
      </div>

      {successMessage && (
        <div className="success-banner">
          <span>✓ {successMessage}</span>
          <button className="banner-dismiss" onClick={() => setSuccessMessage(null)}>✕</button>
        </div>
      )}

      {/* Classification Card if newly created */}
      {latestTicket && (
        <div className="latest-ticket-triage">
          <ClassificationCard
            ticketCode={latestTicket.ticket_code}
            category={latestTicket.category}
            subCategory={latestTicket.sub_category}
            severity={latestTicket.severity}
            priority={latestTicket.priority}
            confidenceScore={latestTicket.confidence_score}
            suggestedTeam={latestTicket.assigned_team}
            reasoning={latestTicket.ai_reasoning ?? 'AI Triaged'}
          />
        </div>
      )}

      {/* TAB 1: WEB PORTAL */}
      {activeTab === 'web' && (
        <div className="tab-card">
          <div className="card-intro">
            <h3>Submit IT Support Request</h3>
            <p>Your tickets are automatically linked to your employee profile and department.</p>
          </div>

          <form onSubmit={handleWebSubmit} className="ticket-submit-form">
            <div className="form-row">
              <div className="form-group disabled-field">
                <label>Requester (Logged-in Employee)</label>
                <input type="text" value={`${user?.full_name} <${user?.email}>`} disabled />
              </div>
              <div className="form-group disabled-field">
                <label>Department</label>
                <input type="text" value={user?.department} disabled />
              </div>
            </div>

            <div className="form-group">
              <label>Issue Title *</label>
              <input
                type="text"
                placeholder="e.g. Cisco AnyConnect VPN disconnects every 15 minutes"
                value={webTitle}
                onChange={(e) => setWebTitle(e.target.value)}
                required
                minLength={5}
              />
            </div>

            <div className="form-group">
              <label>Detailed Description of the Issue *</label>
              <textarea
                rows={4}
                placeholder="Describe what you were doing, any error messages, and what you've tried so far..."
                value={webDescription}
                onChange={(e) => setWebDescription(e.target.value)}
                required
                minLength={10}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary-action" disabled={submitting}>
                {submitting ? 'Submitting & AI Triaging...' : 'Submit Ticket to IT'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: INBOUND EMAIL SIMULATOR */}
      {activeTab === 'email' && (
        <div className="tab-card email-mockup">
          <div className="card-intro">
            <h3>Simulate Email to IT Helpdesk</h3>
            <p>Emails sent to <code>helpdesk@company.com</code> are automatically captured, classified, and pushed to the IT Support stream.</p>
          </div>

          <form onSubmit={handleEmailSubmit} className="email-client-mockup">
            <div className="email-header-field">
              <span className="email-label">From:</span>
              <span className="email-val">{user?.full_name} &lt;{user?.email}&gt;</span>
            </div>
            <div className="email-header-field">
              <span className="email-label">To:</span>
              <span className="email-val">IT Helpdesk &lt;helpdesk@company.com&gt;</span>
            </div>
            <div className="email-header-field">
              <span className="email-label">Subject:</span>
              <input
                type="text"
                className="email-subject-input"
                placeholder="Subject of your support email..."
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                required
                minLength={5}
              />
            </div>

            <div className="email-body-field">
              <textarea
                rows={6}
                className="email-textarea"
                placeholder="Hi IT Team,&#10;&#10;I am running into an issue with...&#10;&#10;Thanks,&#10;Priya"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                required
                minLength={10}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-send-email" disabled={submitting}>
                {submitting ? 'Sending & Ingesting...' : '✉️ Send Email to IT Helpdesk'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: MY SUBMITTED TICKETS */}
      {activeTab === 'history' && (
        <div className="tab-card">
          <div className="card-intro">
            <h3>My Support Tickets</h3>
            <p>Track the real-time status of all tickets opened under your email.</p>
          </div>

          {loading ? (
            <div className="loading-state">Loading your tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="empty-state">You have not submitted any tickets yet.</div>
          ) : (
            <div className="tickets-grid">
              {tickets.map((t) => (
                <div key={t.ticket_id} className={`ticket-status-card status-${t.status.toLowerCase()}`}>
                  <div className="ticket-card-header">
                    <span className="ticket-code-tag">{t.ticket_code}</span>
                    <span className={`status-badge status-${t.status.toLowerCase()}`}>{t.status}</span>
                  </div>
                  <h4 className="ticket-card-title">{t.title}</h4>
                  <p className="ticket-card-desc">{t.description}</p>
                  
                  <div className="ticket-meta-footer">
                    <span className="meta-tag">🏷️ {t.category}</span>
                    <span className="meta-tag">⚡ Priority: <strong>{t.priority}</strong></span>
                    <span className="meta-tag">
                      {t.source === 'EMAIL' ? '✉️ Email' : '🌐 Web Portal'}
                    </span>
                    {t.assigned_to_email && (
                      <span className="meta-tag assigned">👨‍💻 Assigned: {t.assigned_to_email}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: IT RESPONSES & RESOLUTIONS */}
      {activeTab === 'resolutions' && (
        <div className="tab-card resolutions-portal-card">
          <div className="card-intro">
            <div className="intro-badge">
              <span>💬 IT Support Direct Feed</span>
            </div>
            <h3>IT Responses & Verified Resolutions</h3>
            <p>Review official step-by-step troubleshooting solutions and runbook guidance delivered by IT Support for your requests.</p>
          </div>

          {/* Search Bar for resolutions */}
          <div className="resolutions-search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search solutions by keyword, ticket code, or topic..."
              value={solutionSearch}
              onChange={(e) => setSolutionSearch(e.target.value)}
            />
            {solutionSearch && (
              <button className="clear-search" onClick={() => setSolutionSearch('')}>✕</button>
            )}
          </div>

          {loadingSolutions ? (
            <div className="loading-state">
              <span className="btn-spinner"></span>
              <span>Loading IT resolutions...</span>
            </div>
          ) : filteredSolutions.length === 0 ? (
            <div className="empty-resolutions-box">
              <div className="empty-icon">📂</div>
              <h4>No IT Resolutions Available</h4>
              <p>
                {solutionSearch 
                  ? `No resolutions matched "${solutionSearch}". Try a different keyword.` 
                  : "When IT Support engineers resolve your tickets and send official solutions, they will be archived here for your reference."}
              </p>
              {!solutionSearch && tickets.length > 0 && (
                <div className="empty-hint">
                  You have {tickets.length} ticket(s) currently being investigated by IT.
                </div>
              )}
            </div>
          ) : (
            <div className="resolutions-stream">
              {filteredSolutions.map((item) => (
                <div key={item.ticket_id} className="resolution-ticket-card">
                  {/* Card Header */}
                  <div className="res-card-top">
                    <div className="res-code-cluster">
                      <span className="jira-issue-key">{item.ticket_code}</span>
                      <span className="res-category-tag">{item.category}</span>
                      <span className="jira-status-lozenge status-done">✓ Resolved by IT</span>
                    </div>
                    <div className="res-date-meta">
                      {item.resolved_at 
                        ? new Date(item.resolved_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                        : 'Recently Resolved'}
                    </div>
                  </div>

                  <h3 className="res-ticket-title">{item.title}</h3>

                  {/* IT Engineer Resolution Box */}
                  <div className="res-solution-container">
                    <div className="res-solution-header">
                      <div className="res-author-badge">
                        <span className="author-avatar">IT</span>
                        <div className="author-details">
                          <span className="author-name">
                            {item.resolved_by_email ? `Resolved by ${item.resolved_by_email}` : 'IT Service Desk Team'}
                          </span>
                          <span className="author-role">Verified Technical Response</span>
                        </div>
                      </div>
                      <span className="res-verified-pill">🛡️ Verified Solution</span>
                    </div>

                    <div className="res-body-text">
                      <div className="res-formatted-text">{item.solution_text}</div>
                    </div>

                    {/* Cited Internal IT Runbooks */}
                    {item.citations && item.citations.length > 0 && (
                      <div className="res-citations-footer">
                        <span className="citations-lbl">Reference Runbooks Grounded by AI:</span>
                        <div className="citations-chips">
                          {item.citations.map((c) => (
                            <span key={c.article_id} className="citation-pill" title={c.snippet}>
                              📖 {c.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resolution Feedback */}
                  <div className="res-feedback-strip">
                    <span className="feedback-prompt">Did this resolution solve your problem?</span>
                    {feedbackState[item.ticket_id] === 'yes' ? (
                      <span className="feedback-thank">✓ Thank you! Glad this solved your issue.</span>
                    ) : feedbackState[item.ticket_id] === 'no' ? (
                      <span className="feedback-thank warning">⚠️ Noted. We will alert IT to follow up on this issue.</span>
                    ) : (
                      <div className="feedback-buttons">
                        <button
                          className="btn-feedback-yes"
                          onClick={() => handleFeedback(item.ticket_id, 'yes')}
                        >
                          👍 Yes, it worked!
                        </button>
                        <button
                          className="btn-feedback-no"
                          onClick={() => handleFeedback(item.ticket_id, 'no')}
                        >
                          💬 Still having trouble
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
