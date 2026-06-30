import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { SnackbarProvider } from './components/ui/Snackbar';
import UpdatePrompt from './components/UpdatePrompt';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminLayout from './pages/AdminLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import EntryScreen from './pages/EntryScreen';
import PageTransition from './components/ui/PageTransition';

function App() {
  return (
    <AuthProvider>
      <SnackbarProvider>
        <UpdatePrompt />
        <Routes>
          <Route path="/" element={<PageTransition><EntryScreen /></PageTransition>} />
          <Route path="/home" element={<PageTransition><Landing /></PageTransition>} />
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SnackbarProvider>
    </AuthProvider>
  );
}

export default App;
