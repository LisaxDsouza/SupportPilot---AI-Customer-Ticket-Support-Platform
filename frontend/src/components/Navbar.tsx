import React from 'react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout, switchPersona } = useAuth();

  if (!user) return null;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'Admin', color: 'badge-admin' };
      case 'SUPPORT_ENGINEER':
        return { label: 'IT Support', color: 'badge-it' };
      default:
        return { label: 'Employee', color: 'badge-employee' };
    }
  };

  const badge = getRoleBadge(user.role);

  return (
    <header className="app-navbar">
      <div className="nav-brand">
        <div className="brand-logo">SP</div>
        <div>
          <div className="brand-title">SupportPilot</div>
          <div className="brand-subtitle">AI Incident Triage & Resolution</div>
        </div>
      </div>

      <div className="nav-controls">
        <div className="persona-switcher">
          <span className="switcher-label">Switch Role:</span>
          <button
            className={`btn-persona ${user.role === 'EMPLOYEE' ? 'active' : ''}`}
            onClick={() => switchPersona('priya.shah@company.com')}
            title="Log in as Priya Shah (Employee)"
          >
            👤 Employee
          </button>
          <button
            className={`btn-persona ${user.role === 'SUPPORT_ENGINEER' ? 'active' : ''}`}
            onClick={() => switchPersona('engineer@company.com')}
            title="Log in as Support Engineer (IT)"
          >
            🛠️ IT Support
          </button>
          <button
            className={`btn-persona ${user.role === 'ADMIN' ? 'active' : ''}`}
            onClick={() => switchPersona('admin@company.com')}
            title="Log in as System Admin"
          >
            🛡️ Admin
          </button>
        </div>

        <div className="user-profile">
          <div className="avatar-circle">{user.full_name.charAt(0)}</div>
          <div className="user-info">
            <span className="user-name">{user.full_name}</span>
            <span className={`role-pill ${badge.color}`}>{badge.label}</span>
          </div>
          <button className="btn-logout" onClick={logout} title="Sign Out">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
};
