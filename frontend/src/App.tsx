import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import DelaisPage from './pages/DelaisPage';
import AlertesPage from './pages/AlertesPage';
import AnomaliesPage from './pages/AnomaliesPage';
import PredictionsPage from './pages/PredictionsPage';
import ProcessMiningPage from './pages/ProcessMiningPage';
import FinancierPage from './pages/FinancierPage';
import PrevisionsPage from './pages/PrevisionsPage';
import AssistantPage from './pages/AssistantPage';
import SinistresListPage from './pages/SinistresListPage';
import SinistreFormPage from './pages/SinistreFormPage';
import ScannerPage from './pages/ScannerPage';
import CalendrierPage from './pages/CalendrierPage';
import QualiteDonneesPage from './pages/QualiteDonneesPage';
import WelcomePage from './pages/WelcomePage';

function RootRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />

          <Route
            path="/bienvenue"
            element={
              <ProtectedRoute>
                <WelcomePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delais"
            element={
              <ProtectedRoute>
                <DelaisPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alertes"
            element={
              <ProtectedRoute>
                <AlertesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/anomalies"
            element={
              <ProtectedRoute>
                <AnomaliesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/predictions"
            element={
              <ProtectedRoute>
                <PredictionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/process-mining"
            element={
              <ProtectedRoute>
                <ProcessMiningPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/financier"
            element={
              <ProtectedRoute>
                <FinancierPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/previsions"
            element={
              <ProtectedRoute>
                <PrevisionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assistant"
            element={
              <ProtectedRoute>
                <AssistantPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scanner"
            element={
              <ProtectedRoute>
                <ScannerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendrier"
            element={
              <ProtectedRoute>
                <CalendrierPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/qualite-donnees"
            element={
              <ProtectedRoute>
                <QualiteDonneesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sinistres"
            element={
              <ProtectedRoute>
                <SinistresListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sinistres/:id"
            element={
              <ProtectedRoute>
                <SinistreFormPage />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<RootRoute />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
