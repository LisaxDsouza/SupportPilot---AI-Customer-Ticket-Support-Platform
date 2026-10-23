import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { SaaSLayout } from './components/layout/SaaSLayout';

function MainApp() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app-loading-screen">
        <div className="loading-spinner"></div>
        <p>Verifying credentials & database access...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  // Strictly render only the SaaS layout corresponding to the verified database role
  return <SaaSLayout />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
