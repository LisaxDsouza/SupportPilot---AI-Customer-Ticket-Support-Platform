import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  fetchTickets, 
  fetchSystemUsers, 
  updateTicketStatus, 
  assignTicket,
  generateTicketResolution,
  fetchTicketResponses,
  approveTicketResponse
} from '../../services/api';
import type { Ticket, TicketResponseDetail } from '../../types/ticket';
import type { User } from '../../types/auth';
import { ClassificationCard } from '../ClassificationCard';

export const ITDashboard: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Resolution Generator & HITL State
  const [activeResponse, setActiveResponse] = useState<TicketResponseDetail | null>(null);
  const [editedSolutionText, setEditedSolutionText] = useState('');
  const [generatingResolution, setGeneratingResolution] = useState(false);
  const [approvingResolution, setApprovingResolution] = useState(false);
  const [resolutionNotice, setResolutionNotice] = useState<string | null>(null);


  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      loadTicketResponses(selectedTicket.ticket_id);
    } else {
      setActiveResponse(null);
      setEditedSolutionText('');
      setResolutionNotice(null);
    }
  }, [selectedTicket?.ticket_id]);

  const loadTicketResponses = async (ticketId: number) => {
    try {
      const responses = await fetchTicketResponses(ticketId);
      if (responses && responses.length > 0) {
        const approved = responses.find((r) => r.validation_status === 'APPROVED');
        const target = approved || responses[responses.length - 1];
        setActiveResponse(target);
        setEditedSolutionText(target.solution_text);
      } else {
        setActiveResponse(null);
        setEditedSolutionText('');
      }
    } catch (err) {
      console.error('Failed to load ticket responses', err);
    }
  };

  const handleGenerateResolution = async () => {
    if (!selectedTicket) return;
    setGeneratingResolution(true);
    setResolutionNotice(null);
    try {
      const resp = await generateTicketResolution(selectedTicket.ticket_id);
      setActiveResponse(resp);
      setEditedSolutionText(resp.solution_text);
      setResolutionNotice('✨ AI draft generated using verified IT runbooks! Edit the steps below as needed, then approve.');
    } catch (err: any) {
      alert(err.message || 'Failed to generate resolution');
    } finally {
      setGeneratingResolution(false);
    }
  };

  const handleApproveResolution = async () => {
    if (!selectedTicket || !activeResponse) return;
    setApprovingResolution(true);
    try {
      const updated = await approveTicketResponse(selectedTicket.ticket_id, activeResponse.response_id, {
        validation_status: 'APPROVED',
        edited_solution_text: editedSolutionText,
        mark_ticket_resolved: true,
        resolved_by_email: user?.email,
      });
      setActiveResponse(updated);
      setResolutionNotice('✓ Resolution approved and published! Ticket marked as RESOLVED and employee notified.');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to approve resolution');
    } finally {
      setApprovingResolution(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [ticketsData, usersData] = await Promise.all([
        fetchTickets(),
        fetchSystemUsers(),
      ]);
      setTickets(ticketsData);
      setUsers(usersData);
      if (selectedTicket) {
        const refreshed = ticketsData.find((t) => t.ticket_id === selectedTicket.ticket_id);
        if (refreshed) setSelectedTicket(refreshed);
      }
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (ticketId: number, newStatus: string) => {
    try {
      const resolvedBy = newStatus === 'RESOLVED' || newStatus === 'CLOSED' ? (user?.email ?? undefined) : undefined;
      await updateTicketStatus(ticketId, newStatus, resolvedBy);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  const handleAssignChange = async (ticketId: number, targetEmail: string) => {
    try {
      await assignTicket(ticketId, targetEmail);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Assignment failed');
    }
  };

  // Helper to map backend status to Jira status category
  const getJiraStatusGroup = (status: string) => {
    if (status === 'RESOLVED' || status === 'CLOSED') return 'done';
    if (status === 'INVESTIGATING' || status === 'ESCALATED') return 'in_progress';
    return 'todo';
  };

  const getJiraStatusLabel = (status: string) => {
    switch (status) {
      case 'OPEN':
      case 'TRIAGED':
        return 'To Do';
      case 'INVESTIGATING':
        return 'In Progress';
      case 'ESCALATED':
        return 'Escalated';
      case 'RESOLVED':
      case 'CLOSED':
        return 'Done';
      default:
        return status;
    }
  };

  const getPriorityDisplay = (priority: string) => {
    switch (priority) {
      case 'P1':
        return { label: 'Highest', icon: '⤊', color: '#DE350B' };
      case 'P2':
        return { label: 'High', icon: '↑', color: '#FF5630' };
      case 'P3':
        return { label: 'Medium', icon: '＝', color: '#FF8B00' };
      case 'P4':
      default:
        return { label: 'Low', icon: '↓', color: '#0065FF' };
    }
  };

  const getInitials = (nameOrEmail: string) => {
    const parts = nameOrEmail.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nameOrEmail.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (nameOrEmail: string) => {
    const colors = ['#0052CC', '#00875A', '#FF5630', '#6554C0', '#00B8D9', '#36B37E', '#FF8B00'];
    let hash = 0;
    for (let i = 0; i < nameOrEmail.length; i++) hash += nameOrEmail.charCodeAt(i);
    return colors[hash % colors.length];
  };

  // Filters
  const filteredTickets = tickets.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      t.ticket_code.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      t.requester_email.toLowerCase().includes(q) ||
      (t.assigned_to_email && t.assigned_to_email.toLowerCase().includes(q));

    const statusGroup = getJiraStatusGroup(t.status);
    const matchStatus = statusFilter === 'ALL' || statusGroup === statusFilter;
    const matchCategory = categoryFilter === 'ALL' || t.category === categoryFilter;

    return matchSearch && matchStatus && matchCategory;
  });

  const categories = Array.from(new Set(tickets.map((t) => t.category).filter(Boolean)));
  const itStaff = users.filter((u) => u.role === 'SUPPORT_ENGINEER' || u.role === 'ADMIN');

  return (
    <div className="jira-workspace">
      {/* JIRA BREADCRUMB & HEADER */}
      <div className="jira-page-header">
        <div className="jira-breadcrumbs">
          <span className="bc-item">Spaces</span>
          <span className="bc-sep">/</span>
          <span className="bc-item active">SupportPilot IT Service Desk</span>
        </div>

        <div className="jira-title-row">
          <div className="jira-space-title">
            <span className="space-icon">⚡</span>
            <h2>IT Incident Board</h2>
          </div>

          <div className="jira-top-actions">
            <button className="jira-btn jira-btn-secondary" onClick={loadData}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* JIRA SUB-TABS (Summary, Board, List, etc.) */}
        <div className="jira-nav-tabs">
          <button className="jira-tab-btn active">
            <span className="tab-icon">📋</span> List
          </button>
          <button className="jira-tab-btn" onClick={() => setStatusFilter('todo')}>
            To Do ({tickets.filter((t) => getJiraStatusGroup(t.status) === 'todo').length})
          </button>
          <button className="jira-tab-btn" onClick={() => setStatusFilter('in_progress')}>
            In Progress ({tickets.filter((t) => getJiraStatusGroup(t.status) === 'in_progress').length})
          </button>
          <button className="jira-tab-btn" onClick={() => setStatusFilter('done')}>
            Done ({tickets.filter((t) => getJiraStatusGroup(t.status) === 'done').length})
          </button>
        </div>
      </div>

      {/* JIRA CONTROLS BAR (Search, Filters, Assignee circles) */}
      <div className="jira-controls-bar">
        <div className="jira-search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search work..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="jira-filter-dropdowns">
          <select
            className="jira-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="jira-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div className="jira-controls-right">
          <span className="issue-counter">{filteredTickets.length} of {tickets.length}</span>
        </div>
      </div>

      {/* JIRA MAIN WORK TABLE */}
      <div className="jira-table-container">
        {loading ? (
          <div className="jira-loading">Loading Jira issues...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="jira-empty">No matching Jira work items found.</div>
        ) : (
          <table className="jira-list-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th style={{ minWidth: '380px' }}>Work</th>
                <th style={{ width: '200px' }}>Assignee</th>
                <th style={{ width: '190px' }}>Reporter (From)</th>
                <th style={{ width: '120px' }}>Priority</th>
                <th style={{ width: '140px' }}>Status</th>
                <th style={{ width: '110px' }}>Source</th>
                <th style={{ width: '130px' }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((t) => {
                const prio = getPriorityDisplay(t.priority);
                const statusGroup = getJiraStatusGroup(t.status);
                const assigneeName = t.assigned_to_email ? t.assigned_to_email.split('@')[0] : 'Unassigned';
                const reporterName = t.requester_email.split('@')[0].replace('.', ' ');

                return (
                  <tr
                    key={t.ticket_id}
                    className={`jira-row ${selectedTicket?.ticket_id === t.ticket_id ? 'selected-row' : ''}`}
                    onClick={() => setSelectedTicket(t)}
                  >
                    {/* Checkbox / Type icon */}
                    <td className="cell-type">
                      <span className="jira-issue-icon" title="Task">⚡</span>
                    </td>

                    {/* Work column: Key + Summary */}
                    <td className="cell-work">
                      <span className="jira-issue-key" onClick={(e) => { e.stopPropagation(); setSelectedTicket(t); }}>
                        {t.ticket_code}
                      </span>
                      <span className="jira-issue-title" title={t.title}>
                        {t.title}
                      </span>
                    </td>

                    {/* Assignee with avatar circle */}
                    <td className="cell-assignee" onClick={(e) => e.stopPropagation()}>
                      <div className="jira-avatar-cell">
                        <div
                          className="jira-avatar-circle"
                          style={{ backgroundColor: t.assigned_to_email ? getAvatarColor(t.assigned_to_email) : '#97A0AF' }}
                        >
                          {t.assigned_to_email ? getInitials(t.assigned_to_email) : '—'}
                        </div>
                        <select
                          className="jira-inline-assign-select"
                          value={t.assigned_to_email ?? ''}
                          onChange={(e) => handleAssignChange(t.ticket_id, e.target.value)}
                        >
                          <option value="">Unassigned</option>
                          {itStaff.map((staff) => (
                            <option key={staff.email} value={staff.email}>
                              {staff.full_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    {/* Reporter (From whom & department) */}
                    <td className="cell-reporter">
                      <div className="jira-avatar-cell">
                        <div
                          className="jira-avatar-circle"
                          style={{ backgroundColor: getAvatarColor(t.requester_email) }}
                        >
                          {getInitials(t.requester_email)}
                        </div>
                        <span className="jira-reporter-name" title={`${t.requester_email} (${t.department})`}>
                          {reporterName}
                        </span>
                      </div>
                    </td>

                    {/* Priority (Icon + Text e.g. = Medium) */}
                    <td className="cell-priority">
                      <span className="jira-prio-badge" style={{ color: prio.color }}>
                        <span className="prio-icon">{prio.icon}</span>
                        <span className="prio-label">{prio.label}</span>
                      </span>
                    </td>

                    {/* Status Lozenge Dropdown */}
                    <td className="cell-status" onClick={(e) => e.stopPropagation()}>
                      <select
                        className={`jira-status-lozenge status-${statusGroup}`}
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.ticket_id, e.target.value)}
                      >
                        <option value="OPEN">To Do ▾</option>
                        <option value="INVESTIGATING">In Progress ▾</option>
                        <option value="RESOLVED">Done ▾</option>
                      </select>
                    </td>

                    {/* Source (Where) */}
                    <td className="cell-source">
                      <span className={`jira-source-chip ${t.source.toLowerCase()}`}>
                        {t.source === 'EMAIL' ? '✉️ Email' : '🌐 Web'}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="cell-date">
                      {new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* JIRA ISSUE DETAIL SLIDE-OUT DRAWER */}
      {selectedTicket && (
        <div className="jira-drawer-backdrop" onClick={() => setSelectedTicket(null)}>
          <div className="jira-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="jira-drawer-header">
              <div className="drawer-header-left">
                <span className="jira-issue-key-large">{selectedTicket.ticket_code}</span>
                <span className={`jira-status-lozenge status-${getJiraStatusGroup(selectedTicket.status)}`}>
                  {getJiraStatusLabel(selectedTicket.status)}
                </span>
              </div>
              <button className="jira-drawer-close" onClick={() => setSelectedTicket(null)}>✕</button>
            </div>

            <div className="jira-drawer-body">
              <h2 className="drawer-title">{selectedTicket.title}</h2>

              {/* Status quick switcher buttons */}
              <div className="drawer-quick-actions">
                <button
                  className={`action-btn ${selectedTicket.status === 'OPEN' ? 'active' : ''}`}
                  onClick={() => handleStatusChange(selectedTicket.ticket_id, 'OPEN')}
                >
                  To Do
                </button>
                <button
                  className={`action-btn ${selectedTicket.status === 'INVESTIGATING' ? 'active' : ''}`}
                  onClick={() => handleStatusChange(selectedTicket.ticket_id, 'INVESTIGATING')}
                >
                  In Progress
                </button>
                <button
                  className={`action-btn done ${selectedTicket.status === 'RESOLVED' ? 'active' : ''}`}
                  onClick={() => handleStatusChange(selectedTicket.ticket_id, 'RESOLVED')}
                >
                  ✓ Mark Done
                </button>
              </div>

              {/* DETAILS GRID */}
              <div className="drawer-fields-grid">
                <div className="field-row">
                  <span className="field-label">Assignee:</span>
                  <select
                    className="jira-drawer-select"
                    value={selectedTicket.assigned_to_email ?? ''}
                    onChange={(e) => handleAssignChange(selectedTicket.ticket_id, e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {itStaff.map((staff) => (
                      <option key={staff.email} value={staff.email}>
                        {staff.full_name} ({staff.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field-row">
                  <span className="field-label">Reporter (From):</span>
                  <span className="field-val">
                    {selectedTicket.requester_email} ({selectedTicket.department})
                  </span>
                </div>

                <div className="field-row">
                  <span className="field-label">Intake Source:</span>
                  <span className="field-val">
                    {selectedTicket.source === 'EMAIL' ? '✉️ Inbound Email' : '🌐 Web Portal'}
                  </span>
                </div>

                <div className="field-row">
                  <span className="field-label">Category:</span>
                  <span className="field-val">{selectedTicket.category} · {selectedTicket.sub_category}</span>
                </div>

                <div className="field-row">
                  <span className="field-label">Priority:</span>
                  <span className="field-val">
                    <strong>{selectedTicket.priority}</strong> ({selectedTicket.severity} Severity)
                  </span>
                </div>

                {selectedTicket.resolved_by_email && (
                  <div className="field-row">
                    <span className="field-label">Resolved By:</span>
                    <span className="field-val" style={{ color: '#00875A', fontWeight: 600 }}>
                      ✓ {selectedTicket.resolved_by_email}
                    </span>
                  </div>
                )}
              </div>

              {/* DESCRIPTION SECTION */}
              <div className="drawer-section">
                <h3>Description</h3>
                <div className="jira-desc-panel">
                  {selectedTicket.description}
                </div>
              </div>

              {/* AI RESOLUTION & HITL APPROVAL SECTION */}
              <div className="drawer-section resolution-section">
                <div className="resolution-section-header">
                  <div className="section-title-wrap">
                    <h3>⚡ AI Resolution Copilot</h3>
                    <span className="copilot-subtext">Grounds troubleshooting steps in IT runbooks with Human-in-the-Loop review.</span>
                  </div>
                  {activeResponse?.validation_status === 'APPROVED' ? (
                    <span className="jira-status-lozenge status-done">✓ Approved & Sent</span>
                  ) : activeResponse ? (
                    <span className="jira-status-lozenge status-in_progress">Draft Pending Approval</span>
                  ) : null}
                </div>

                {resolutionNotice && (
                  <div className={`resolution-notice ${activeResponse?.validation_status === 'APPROVED' ? 'notice-success' : 'notice-info'}`}>
                    <span>{resolutionNotice}</span>
                    <button className="notice-dismiss" onClick={() => setResolutionNotice(null)}>✕</button>
                  </div>
                )}

                {!activeResponse ? (
                  <div className="resolution-empty-box">
                    <p>No resolution drafted for this ticket yet. Generate an intelligent troubleshooting response using enterprise runbooks.</p>
                    <button
                      className="btn-generate-resolution"
                      onClick={handleGenerateResolution}
                      disabled={generatingResolution}
                    >
                      {generatingResolution ? (
                        <>
                          <span className="btn-spinner"></span>
                          <span>Searching Runbooks & Generating Response...</span>
                        </>
                      ) : (
                        <>
                          <span>⚡</span>
                          <span>Generate Resolution</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="resolution-card">
                    {/* Runbook Grounding & Citations */}
                    <div className="resolution-meta-bar">
                      <div className="grounding-info">
                        <span className="grounding-badge">
                          🎯 {Math.round(activeResponse.confidence_score * 100)}% Grounded
                        </span>
                        <span className="rag-label">Enterprise IT Runbooks</span>
                      </div>
                      <button
                        className="btn-subtle-regen"
                        onClick={handleGenerateResolution}
                        disabled={generatingResolution || approvingResolution}
                        title="Re-run RAG and AI generator"
                      >
                        {generatingResolution ? 'Regenerating...' : '↻ Regenerate Draft'}
                      </button>
                    </div>

                    {activeResponse.citations && activeResponse.citations.length > 0 && (
                      <div className="citations-tray">
                        <span className="citations-title">Cited IT Runbooks:</span>
                        <div className="citations-list">
                          {activeResponse.citations.map((c) => (
                            <div key={c.article_id} className="citation-chip" title={c.snippet}>
                              <span className="citation-icon">📖</span>
                              <span className="citation-name">{c.title}</span>
                              <span className="citation-score">{Math.round(c.similarity * 100)}% match</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Editable Resolution Textarea */}
                    <div className="resolution-input-group">
                      <div className="resolution-label-row">
                        <label>
                          {activeResponse.validation_status === 'APPROVED' 
                            ? 'Sent Resolution Text (Live with Employee):' 
                            : 'Review & Edit Troubleshooting Steps before sending:'}
                        </label>
                        <span className="edit-hint">
                          {activeResponse.validation_status === 'APPROVED' ? '✓ Published' : '✏️ Editable'}
                        </span>
                      </div>
                      <textarea
                        className="resolution-editor"
                        rows={7}
                        value={editedSolutionText}
                        onChange={(e) => setEditedSolutionText(e.target.value)}
                        placeholder="Resolution text..."
                        disabled={approvingResolution}
                      />
                    </div>

                    {/* Actions: Approve / Edit */}
                    <div className="resolution-actions-bar">
                      <button
                        className="btn-approve-resolution"
                        onClick={handleApproveResolution}
                        disabled={approvingResolution || generatingResolution || !editedSolutionText.trim()}
                      >
                        {approvingResolution ? (
                          <>
                            <span className="btn-spinner"></span>
                            <span>Saving & Publishing...</span>
                          </>
                        ) : activeResponse.validation_status === 'APPROVED' ? (
                          <>
                            <span>✓</span>
                            <span>Update & Re-publish Resolution</span>
                          </>
                        ) : (
                          <>
                            <span>✓</span>
                            <span>Approve & Send Resolution to Employee</span>
                          </>
                        )}
                      </button>

                      {activeResponse.validation_status !== 'APPROVED' && (
                        <span className="hitl-tag">
                          🛡️ Human-in-the-Loop review ensures zero hallucination.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* AI CLASSIFIER / TRIAGE SECTION */}
              <div className="drawer-section">
                <h3>✨ AI Diagnostics & Triage</h3>
                <ClassificationCard
                  ticketCode={selectedTicket.ticket_code}
                  category={selectedTicket.category}
                  subCategory={selectedTicket.sub_category}
                  severity={selectedTicket.severity}
                  priority={selectedTicket.priority}
                  confidenceScore={selectedTicket.confidence_score}
                  suggestedTeam={selectedTicket.assigned_team}
                  reasoning={selectedTicket.ai_reasoning ?? 'AI Triaged automatically.'}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
