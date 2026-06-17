import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { SnackbarProvider } from './components/ui/Snackbar';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminLayout from './pages/AdminLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';

function App() {
  return (
    <AuthProvider>
      <SnackbarProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </SnackbarProvider>
    </AuthProvider>
  );
}

export default App;
