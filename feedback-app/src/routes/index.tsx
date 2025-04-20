import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { UserRole } from '../types/UserRole';

// Pages
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Users from '../pages/Users';
import Businesses from '../pages/Businesses';
import Surveys from '../pages/Surveys';
import QRCodes from '../pages/QRCodes';
import Profile from '../pages/Profile';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

const AppRoutes = () => {
    const { user } = useAuth();

    if (!user) {
        return (
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        );
    }

    return (
        <Layout>
            <Routes>
                <Route path="/" element={<Dashboard />} />

                {/* Admin Routes */}
                <Route
                    path="/users"
                    element={
                        <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN]}>
                            <Users />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/businesses"
                    element={
                        <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN]}>
                            <Businesses />
                        </ProtectedRoute>
                    }
                />

                {/* Common Routes */}
                <Route path="/surveys" element={<Surveys />} />
                <Route path="/qr-codes" element={<QRCodes />} />
                <Route path="/profile" element={<Profile />} />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Layout>
    );
};

export default AppRoutes; 