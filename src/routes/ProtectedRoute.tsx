// Danee Shoes & Clean — Protected Route
// Redirects unauthenticated users to /login

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

/* ------------------------------------------------------------------ */
/*  Loading Spinner Component                                         */
/* ------------------------------------------------------------------ */
function LoadingSpinner() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        background: '#f5f5f5',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: '4px solid #e5e7eb',
          borderTopColor: '#034BB9',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>
        Memuat...
      </span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ProtectedRoute                                                    */
/* ------------------------------------------------------------------ */
interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
