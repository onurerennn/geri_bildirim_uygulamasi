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
import Customer from '../pages/Customer';

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

    return (
        <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
            <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />

            <Route element={<Layout />}>
                <Route path="/" element={
                    <ProtectedRoute>
                        {user?.role === UserRole.CUSTOMER ? <Customer /> : <Dashboard />}
                    </ProtectedRoute>
                } />

                <Route path="/customer" element={
                    <ProtectedRoute allowedRoles={[UserRole.CUSTOMER]}>
                        <Customer />
                    </ProtectedRoute>
                } />

                <Route path="/users" element={
                    <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN]}>
                        <Users />
                    </ProtectedRoute>
                } />

                <Route path="/businesses" element={
                    <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
                        <Businesses />
                    </ProtectedRoute>
                } />

                <Route path="/surveys" element={
                    <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN]}>
                        <Surveys />
                    </ProtectedRoute>
                } />

                <Route path="/qrcodes" element={
                    <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN]}>
                        <QRCodes />
                    </ProtectedRoute>
                } />

                <Route path="/profile" element={
                    <ProtectedRoute>
                        <Profile />
                    </ProtectedRoute>
                } />
            </Route>
        </Routes>
    );
};

  