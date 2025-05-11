import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SnackbarProvider } from './contexts/SnackbarContext';
import theme from './theme';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SuperAdminPanel from './pages/SuperAdminPanel';
import Customer from './pages/Customer';
import { UserRole } from './types/UserRole';
import Businesses from './pages/Businesses';
import Users from './pages/Users';
import Profile from './pages/Profile';
import QRCodes from './pages/QRCodes';
import Surveys from './pages/Surveys';
import Rewards from './pages/Rewards';
import NewSurvey from './pages/NewSurvey';
import DevTools from './pages/DevTools';
import SurveyQRCodes from './pages/SurveyQRCodes';
import SurveyByCodePage from './pages/SurveyByCodePage';
import PublicSurveyPage from './pages/PublicSurveyPage';
import SurveyDetails from './pages/SurveyDetails';
import EditSurvey from './pages/EditSurvey';
import BusinessResponses from './pages/BusinessResponses';

// Korumalı rotalar için bileşen
const ProtectedRoute = ({
  children,
  allowedRoles
}: {
  children: React.ReactNode,
  allowedRoles?: UserRole[]
}) => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if user needs business configuration and is trying to access business routes
    if (user?.needsBusinessConfig && location.pathname.includes('/business/')) {
      console.log('Kullanıcı işletme ayarlarına ihtiyaç duyuyor, DevTools sayfasına yönlendiriliyor');
      navigate('/dev-tools');
    }
  }, [user, location.pathname, navigate]);

  if (!isAuthenticated) {
    // Oturum açılmamışsa login sayfasına yönlendir
    return <Navigate to="/login" replace />;
  }

  // Rol tabanlı erişim kontrolü (eğer rol belirtilmişse)
  if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
    // Kullanıcının rolü yetkili değilse ana sayfaya yönlendir
    return <Navigate to="/" replace />;
  }

  // Business Admin trying to access business pages without a business ID
  if (user?.role === UserRole.BUSINESS_ADMIN &&
    !user.business &&
    location.pathname.includes('/business/') &&
    !location.pathname.includes('/dev-tools')) {
    console.log('BUSINESS_ADMIN without business ID trying to access business routes');
    return <Navigate to="/dev-tools" replace />;
  }

  return <>{children}</>;
};

// Ana sayfa bileşeni - Rol tabanlı içerik gösterimi
const HomePage = () => {
  const { user } = useAuth();
  console.log('HomePage: Kullanıcı rolü:', user?.role);

  // Farklı roller için farklı içerik
  if (user?.role === UserRole.CUSTOMER) {
    return <Customer />;
  } else if (user?.role === UserRole.SUPER_ADMIN) {
    console.log('SuperAdmin için Dashboard gösteriliyor');
    return <SuperAdminPanel />;
  } else if (user?.role === UserRole.BUSINESS_ADMIN) {
    return <Dashboard />;
  }

  // Varsayılan durum (beklenmeyen rol)
  console.warn('Bilinmeyen rol:', user?.role);
  return <div>Hoş geldiniz - Bilinmeyen Rol</div>;
};

// Dashboard rotaları bileşeni
const DashboardRoutes = () => {
  const { user } = useAuth();

  if (user?.role === UserRole.SUPER_ADMIN) {
    return <SuperAdminPanel />;
  }
  return <Dashboard />;
};

// Ana uygulama rotaları
const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [isLogging, setIsLogging] = useState(false);

  // Sadece başlangıçta ve kritik durum değişikliklerinde log
  useEffect(() => {
    console.log('Auth değişti:', {
      isAuthenticated,
      userRole: user?.role,
      hasBusiness: !!user?.business,
      needsConfig: user?.needsBusinessConfig
    });
  }, [isAuthenticated, user?.role, user?.business, user?.needsBusinessConfig]);

  // Sayfa değişikliklerini sadece log amaçlı takip et
  useEffect(() => {
    console.log('Sayfa değişti:', location.pathname);

    // Check if a BUSINESS_ADMIN is navigating to a business page without a business ID
    if (user?.role === UserRole.BUSINESS_ADMIN &&
      !user.business &&
      location.pathname.includes('/business/') &&
      !location.pathname.includes('/dev-tools')) {
      console.log('Redirecting to DevTools for business setup');
      // We don't need to navigate here as the ProtectedRoute component will handle it
    }
  }, [location.pathname, user]);

  // Oturum açma durumunu takip et ve sonsuz döngüleri önle
  useEffect(() => {
    if (location.pathname === '/login' && isAuthenticated && !isLogging) {
      setIsLogging(true);
      // İşlem tamamlandıktan sonra state'i sıfırla
      setTimeout(() => setIsLogging(false), 100);
    }
  }, [location.pathname, isAuthenticated, isLogging]);

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />}
      />
      <Route
        path="/register"
        element={!isAuthenticated ? <Register /> : <Navigate to="/" replace />}
      />

      {/* QR Code ile anket erişim rotası */}
      <Route path="/survey/code/:code" element={<SurveyByCodePage />} />
      <Route path="/survey/:id" element={<PublicSurveyPage />} />

      {/* İşletme yanıtları görüntüleme sayfaları */}
      <Route
        path="/business/:businessId/responses"
        element={
          <ProtectedRoute allowedRoles={[UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN]}>
            <BusinessResponses />
          </ProtectedRoute>
        }
      />

      <Route
        path="/survey/:surveyId/responses"
        element={
          <ProtectedRoute allowedRoles={[UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN]}>
            <BusinessResponses />
          </ProtectedRoute>
        }
      />

      {/* Development Tools */}
      <Route
        path="/dev-tools"
        element={<DevTools />}
      />

      {/* Protected routes */}
      <Route element={<Layout />}>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN]}>
              <DashboardRoutes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
              <SuperAdminPanel />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/businesses"
          element={
            <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
              <Businesses />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
              <Users />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users/:id"
          element={
            <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
              <Users />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customer"
          element={
            <ProtectedRoute allowedRoles={[UserRole.CUSTOMER]}>
              <Customer />
            </ProtectedRoute>
          }
        />

        {/* Business Admin Routes */}
        <Route
          path="/business/profile"
          element={
            <ProtectedRoute allowedRoles={[UserRole.BUSINESS_ADMIN]}>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/business/qr-codes"
          element={
            <ProtectedRoute allowedRoles={[UserRole.BUSINESS_ADMIN]}>
              <QRCodes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/business/surveys"
          element={
            <ProtectedRoute allowedRoles={[UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN]}>
              <Surveys />
            </ProtectedRoute>
          }
        />

        <Route
          path="/business/surveys/new"
          element={
            <ProtectedRoute allowedRoles={[UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN]}>
              <NewSurvey />
            </ProtectedRoute>
          }
        />

        <Route
          path="/business/surveys/:id"
          element={
            <ProtectedRoute allowedRoles={[UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN]}>
              <SurveyDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/business/surveys/:surveyId/edit"
          element={
            <ProtectedRoute allowedRoles={[UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN]}>
              <EditSurvey />
            </ProtectedRoute>
          }
        />

        <Route
          path="/business/rewards"
          element={
            <ProtectedRoute allowedRoles={[UserRole.BUSINESS_ADMIN]}>
              <Rewards />
            </ProtectedRoute>
          }
        />

        <Route
          path="/business/analytics"
          element={
            <ProtectedRoute allowedRoles={[UserRole.BUSINESS_ADMIN]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/business/surveys/:surveyId/qr-codes"
          element={
            <ProtectedRoute allowedRoles={[UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN]}>
              <SurveyQRCodes />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* 404 - Bulunamayan sayfalar */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider theme={theme}>
          <SnackbarProvider>
            <CssBaseline />
            <AppRoutes />
          </SnackbarProvider>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
