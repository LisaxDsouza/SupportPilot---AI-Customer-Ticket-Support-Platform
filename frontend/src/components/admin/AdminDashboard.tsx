import React, { useState, useEffect } from 'react';
import { assignTicket, fetchSystemUsers, fetchTickets, updateTicketStatus } from '../../services/api';
import type { Ticket } from '../../types/ticket';
import type { User } from '../../types/auth';

interface AdminDashboardProps {
  activeTab?: 'all' | 'analytics' | 'workload' | 'directory';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeTab = 'all' }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [assigningId, setAssigningId] = useState<number | null>(null);


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ticketsData, usersData] = await Promise.all([
        fetchTickets(),
        fetchSystemUsers(),
      ]);
      setTickets(ticketsData);
      setUsers(usersData);
    } catch (err) {
      console.error('Error loading admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (ticketId: number, targetEmail: string) => {
    setAssigningId(ticketId);
    try {
      await assignTicket(ticketId, targetEmail);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to assign ticket');
    } finally {
      setAssigningId(null);
    }
  };

  const handleStatusChange = async (ticketId: number, status: string) => {
    try {
      await updateTicketStatus(ticketId, status);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  // KPI calculations
  const totalTickets = tickets.length;
  const openCount = tickets.filter((t) => t.status === 'OPEN' || t.status === 'TRIAGED').length;
  const ongoingCount = tickets.filter((t) => t.status === 'INVESTIGATING' || t.status === 'ESCALATED').length;
  const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  const itStaff = users.filter((u) => u.role === 'SUPPORT_ENGINEER' || u.role === 'ADMIN');

  const filteredTickets = tickets.filter((t) => {
    const q = searchTerm.toLowerCase();
    return (
      t.ticket_code.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      t.requester_email.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      (t.assigned_to_email && t.assigned_to_email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h2>System Administration & Governance</h2>
          <p>Global visibility, IT workload distribution, and resolution audit tracking.</p>
        </div>
        <button className="btn-refresh" onClick={loadData}>↻ Refresh Data</button>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="kpi-grid">
        <div className="kpi-card total">
          <span className="kpi-label">Total Volume</span>
          <span className="kpi-val">{totalTickets}</span>
          <span className="kpi-sub">Lifetime Incidents</span>
        </div>
        <div className="kpi-card open">
          <span className="kpi-label">To Do / Intake</span>
          <span className="kpi-val">{openCount}</span>
          <span className="kpi-sub">Awaiting Assignment</span>
        </div>
        <div className="kpi-card ongoing">
          <span className="kpi-label">Active Ongoing</span>
          <span className="kpi-val">{ongoingCount}</span>
          <span className="kpi-sub">Under Investigation</span>
        </div>
        <div className="kpi-card resolved">
          <span className="kpi-label">Resolved</span>
          <span className="kpi-val">{resolvedCount}</span>
          <span className="kpi-sub">Resolved & Verified</span>
        </div>
      </div>

      {/* IT WORKLOAD SUMMARY */}
      <div className="admin-section-box">
        <h3>IT Support Team Workload</h3>
        <div className="workload-grid">
          {itStaff.map((staff) => {
            const activeAssigned = tickets.filter(
              (t) => t.assigned_to_email === staff.email && t.status !== 'RESOLVED' && t.status !== 'CLOSED'
            ).length;
            const solvedCount = tickets.filter((t) => t.resolved_by_email === staff.email).length;

            return (
              <div key={staff.user_id} className="staff-card">
                <div className="staff-avatar">{staff.full_name.charAt(0)}</div>
                <div className="staff-info">
                  <div className="staff-name">{staff.full_name}</div>
                  <div className="staff-email">{staff.email}</div>
                  <div className="staff-stats">
                    <span>⚡ Active: <strong>{activeAssigned}</strong></span>
                    <span>✓ Solved: <strong>{solvedCount}</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MASTER TICKETS TABLE WITH ASSIGNMENT & RESOLVED-BY TRACKING */}
      <div className="admin-section-box">
        <div className="table-header-row">
          <h3>Master Incident Directory ({filteredTickets.length})</h3>
          <input
            type="text"
            className="admin-search-input"
            placeholder="Search by code, title, requester, or assignee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading-state">Loading incidents...</div>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Whom (Requester)</th>
                  <th>Where (Source)</th>
                  <th>Issue Title</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned IT Staff</th>
                  <th>Solved By</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((t) => (
                  <tr key={t.ticket_id}>
                    <td><span className="ticket-code-tag">{t.ticket_code}</span></td>
                    <td>
                      <div className="table-requester">
                        <strong>{t.requester_email.split('@')[0]}</strong>
                        <small>{t.requester_email} ({t.department})</small>
                      </div>
                    </td>
                    <td>
                      <span className={`badge-source ${t.source.toLowerCase()}`}>
                        {t.source === 'EMAIL' ? '✉️ Email' : t.source === 'WEB_PORTAL' ? '🌐 Web Portal' : t.source}
                      </span>
                    </td>
                    <td className="table-title-cell" title={t.description}>
                      <strong>{t.title}</strong>
                    </td>
                    <td><span className="category-pill">{t.category}</span></td>
                    <td><span className={`badge-priority p-${t.priority.toLowerCase()}`}>{t.priority}</span></td>
                    <td>
                      <select
                        className="table-status-select"
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.ticket_id, e.target.value)}
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="TRIAGED">TRIAGED</option>
                        <option value="INVESTIGATING">INVESTIGATING</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </td>
                    <td>
                      <select
                        className="table-assign-select"
                        value={t.assigned_to_email ?? ''}
                        disabled={assigningId === t.ticket_id}
                        onChange={(e) => handleAssign(t.ticket_id, e.target.value)}
                      >
                        <option value="">-- Unassigned --</option>
                        {itStaff.map((staff) => (
                          <option key={staff.email} value={staff.email}>
                            {staff.full_name} ({staff.role === 'ADMIN' ? 'Admin' : 'IT'})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {t.resolved_by_email ? (
                        <span className="badge-solved-by">✓ {t.resolved_by_email.split('@')[0]}</span>
                      ) : (
                        <span className="badge-unsolved">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
