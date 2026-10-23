import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { EmployeePortal } from '../employee/EmployeePortal';
import { ITDashboard } from '../it/ITDashboard';
import { AdminDashboard } from '../admin/AdminDashboard';

export const SaaSLayout: React.FC = () => {
  const { user, logout } = useAuth();

  // Employee sub-tabs
  const [employeeTab, setEmployeeTab] = useState<'web' | 'email' | 'history' | 'resolutions'>('web');

  // Admin sub-tabs
  const [adminTab, setAdminTab] = useState<'all' | 'analytics' | 'workload' | 'directory'>('all');

  if (!user) return null;

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Admin Workspace';
      case 'SUPPORT_ENGINEER':
        return 'IT Service Desk';
      default:
        return 'Employee Self-Service';
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="jira-shell">
      {/* ================= TOP JIRA APP BAR ================= */}
      <header className="jira-topbar">
        <div className="topbar-left">
          <button className="btn-app-switcher" title="Apps">
            <span>:::</span>
          </button>
          <div className="jira-brand-cluster">
            <span className="jira-logo-mark">SP</span>
            <span className="jira-brand-name">SupportPilot</span>
          </div>
          <div className="jira-current-space-pill">
            <span className="space-dot"></span>
            <span>{getRoleLabel(user.role)}</span>
          </div>
        </div>

        <div className="topbar-center">
          <div className="jira-global-search">
            <span className="search-glass">🔍</span>
            <input type="text" placeholder="Search tickets..." />
            <span className="search-slash">/</span>
          </div>
        </div>

        <div className="topbar-right">
          <div className="user-profile-cluster">
            <div className="jira-user-avatar" title={`${user.full_name} (${user.email})`}>
              {getInitials(user.full_name)}
            </div>
            <div className="jira-user-meta">
              <span className="jira-user-display-name">{user.full_name}</span>
              <span className="jira-user-role-label">{user.role}</span>
            </div>
            <button className="jira-btn-signout" onClick={logout} title="Sign Out to Login Page">
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ================= BODY: SIDEBAR + MAIN CONTENT ================= */}
      <div className="jira-body">
        {/* LEFT JIRA SIDEBAR */}
        <aside className="jira-sidebar">
          {/* Active Space Item */}
          <div className="sidebar-space-card">
            <div className="space-icon-box">IT</div>
            <div className="space-info">
              <div className="space-name">SupportPilot Desk</div>
              <div className="space-type">Service project</div>
            </div>
          </div>

          <div className="sidebar-section-title">Views</div>
          <nav className="jira-sidebar-nav">
            {/* EMPLOYEE WORKSPACE TABS */}
            {user.role === 'EMPLOYEE' && (
              <>
                <button
                  className={`jira-nav-item ${employeeTab === 'web' ? 'active' : ''}`}
                  onClick={() => setEmployeeTab('web')}
                >
                  <span className="nav-icon">＋</span>
                  <span>Submit Ticket</span>
                </button>
                <button
                  className={`jira-nav-item ${employeeTab === 'email' ? 'active' : ''}`}
                  onClick={() => setEmployeeTab('email')}
                >
                  <span className="nav-icon">✉️</span>
                  <span>Email Simulator</span>
                </button>
                <button
                  className={`jira-nav-item ${employeeTab === 'history' ? 'active' : ''}`}
                  onClick={() => setEmployeeTab('history')}
                >
                  <span className="nav-icon">📋</span>
                  <span>My Open Tickets</span>
                </button>
                <button
                  className={`jira-nav-item ${employeeTab === 'resolutions' ? 'active' : ''}`}
                  onClick={() => setEmployeeTab('resolutions')}
                >
                  <span className="nav-icon">💬</span>
                  <span>IT Resolutions</span>
                </button>
              </>
            )}

            {/* IT SUPPORT WORKSPACE TABS */}
            {user.role === 'SUPPORT_ENGINEER' && (
              <>
                <button className="jira-nav-item active">
                  <span className="nav-icon">📋</span>
                  <span>Jira Work List</span>
                </button>
              </>
            )}

            {/* ADMIN WORKSPACE TABS */}
            {user.role === 'ADMIN' && (
              <>
                <button
                  className={`jira-nav-item ${adminTab === 'all' ? 'active' : ''}`}
                  onClick={() => setAdminTab('all')}
                >
                  <span className="nav-icon">🎛️</span>
                  <span>All Incident Data</span>
                </button>
                <button
                  className={`jira-nav-item ${adminTab === 'analytics' ? 'active' : ''}`}
                  onClick={() => setAdminTab('analytics')}
                >
                  <span className="nav-icon">📈</span>
                  <span>Executive Analytics</span>
                </button>
                <button
                  className={`jira-nav-item ${adminTab === 'workload' ? 'active' : ''}`}
                  onClick={() => setAdminTab('workload')}
                >
                  <span className="nav-icon">👥</span>
                  <span>Team Workload</span>
                </button>
                <button
                  className={`jira-nav-item ${adminTab === 'directory' ? 'active' : ''}`}
                  onClick={() => setAdminTab('directory')}
                >
                  <span className="nav-icon">📑</span>
                  <span>Master Directory</span>
                </button>
              </>
            )}
          </nav>

          <div className="sidebar-section-title">Support Channels</div>
          <div className="jira-channel-item">
            <span className="channel-icon">🌐</span>
            <span>Customer Portal</span>
          </div>
          <div className="jira-channel-item">
            <span className="channel-icon">✉️</span>
            <span>helpdesk@company.com</span>
          </div>

          <div className="sidebar-footer-info">
            <div className="user-email-tag">{user.email}</div>
            <div className="dept-tag">{user.department}</div>
          </div>
        </aside>

        {/* MAIN JIRA CONTENT AREA */}
        <main className="jira-main-content">
          {user.role === 'EMPLOYEE' && (
            <EmployeePortal
              activeTab={employeeTab}
              onTabChange={(tab) => setEmployeeTab(tab)}
            />
          )}

          {user.role === 'SUPPORT_ENGINEER' && (
            <ITDashboard />
          )}

          {user.role === 'ADMIN' && (
            <AdminDashboard activeTab={adminTab} />
          )}
        </main>
      </div>
    </div>
  );
};
