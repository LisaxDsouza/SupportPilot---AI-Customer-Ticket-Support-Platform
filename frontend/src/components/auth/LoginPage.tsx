import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types/auth';

export const LoginPage: React.FC = () => {
  const { login, register, switchPersona } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Validate work email
  const isWorkEmailValid = email.includes('@') && email.split('@')[1]?.includes('.');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Please provide your work email and password.');
      return;
    }
    if (!isWorkEmailValid) {
      setError('Please enter a valid corporate or work email address.');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register({
          email: email.trim().toLowerCase(),
          password,
          full_name: fullName.trim() || email.split('@')[0],
          department,
          role,
        });
      } else {
        await login({ email: email.trim().toLowerCase(), password });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setError(null);
    setLoading(true);
    try {
      await switchPersona(demoEmail);
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-badge">SP</div>
          <h2>SupportPilot</h2>
          <p className="login-tagline">Enterprise IT Incident Triage & Resolution Agent</p>
        </div>

        {error && <div className="login-error-banner">{error}</div>}

        <div className="login-tabs">
          <button
            className={`login-tab ${!isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(false); setError(null); }}
          >
            Sign In
          </button>
          <button
            className={`login-tab ${isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(true); setError(null); }}
          >
            Register Work Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Work Email</label>
            <div className="input-with-validation">
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {email && (
                <span className={`email-indicator ${isWorkEmailValid ? 'valid' : 'invalid'}`}>
                  {isWorkEmailValid ? '✓ Work Email' : '✗ Invalid Format'}
                </span>
              )}
            </div>
          </div>

          {isRegister && (
            <>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Priya Shah"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Department</label>
                  <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                    <option value="Engineering">Engineering</option>
                    <option value="Finance">Finance</option>
                    <option value="HR">HR</option>
                    <option value="Operations">Operations</option>
                    <option value="Sales">Sales</option>
                    <option value="IT Operations">IT Operations</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                    <option value="EMPLOYEE">Employee (Requester)</option>
                    <option value="SUPPORT_ENGINEER">IT Support Engineer</option>
                    <option value="ADMIN">System Administrator</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {!isRegister && (
              <span className="field-hint">Default password for demo accounts: <code>password123</code></span>
            )}
          </div>

          <button type="submit" className="btn-primary-action" disabled={loading}>
            {loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="demo-access-divider">
          <span>Or sign in with 1-click demo personas</span>
        </div>

        <div className="demo-accounts-grid">
          <button
            type="button"
            className="demo-card employee"
            onClick={() => handleQuickLogin('priya.shah@company.com')}
          >
            <div className="demo-role-tag">👤 Employee</div>
            <div className="demo-name">Priya Shah</div>
            <div className="demo-email">priya.shah@company.com</div>
          </button>

          <button
            type="button"
            className="demo-card it"
            onClick={() => handleQuickLogin('engineer@company.com')}
          >
            <div className="demo-role-tag">🛠️ IT Support</div>
            <div className="demo-name">Senior Support Engineer</div>
            <div className="demo-email">engineer@company.com</div>
          </button>

          <button
            type="button"
            className="demo-card admin"
            onClick={() => handleQuickLogin('admin@company.com')}
          >
            <div className="demo-role-tag">🛡️ Admin</div>
            <div className="demo-name">System Admin</div>
            <div className="demo-email">admin@company.com</div>
          </button>
        </div>
      </div>
    </div>
  );
};
