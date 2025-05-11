import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/UserRole';

interface DashboardCardProps {
    title: string;
    description: string;
    icon: string;
    onClick: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, description, icon, onClick }) => (
    <div
        onClick={onClick}
        style={{
            padding: '24px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 3px 5px rgba(0,0,0,0.2)',
            height: '100%',
        }}
        onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 6px 10px rgba(0,0,0,0.3)';
        }}
        onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 3px 5px rgba(0,0,0,0.2)';
        }}
    >
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>{icon}</div>
        <h3>{title}</h3>
        <p>{description}</p>
    </div>
);

const SuperAdminDashboard = () => {
    const navigate = useNavigate();
    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', margin: '24px 0' }}>
                <div style={{ flex: '1 1 300px', minWidth: '300px' }}>
                    <DashboardCard
                        title="İşletmeler"
                        description="İşletmeleri görüntüle, ekle, düzenle ve yönet"
                        icon="🏢"
                        onClick={() => navigate('/admin/businesses')}
                    />
                </div>
                <div style={{ flex: '1 1 300px', minWidth: '300px' }}>
                    <DashboardCard
                        title="Kullanıcılar"
                        description="Sistem kullanıcılarını yönet ve rolleri düzenle"
                        icon="👥"
                        onClick={() => navigate('/admin/users')}
                    />
                </div>
                <div style={{ flex: '1 1 300px', minWidth: '300px' }}>
                    <DashboardCard
                        title="Sistem Analizi"
                        description="Genel sistem istatistiklerini ve performans metriklerini görüntüle"
                        icon="📊"
                        onClick={() => navigate('/admin/analytics')}
                    />
                </div>
            </div>
        </div>
    );
};

const BusinessAdminDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const businessId = user?.business;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', margin: '24px 0' }}>
                <div style={{ flex: '1 1 300px', minWidth: '300px' }}>
                    <DashboardCard
                        title="QR Kodları"
                        description="QR kodları oluştur, görüntüle ve yönet"
                        icon="📱"
                        onClick={() => navigate('/business/qr-codes')}
                    />
                </div>
                <div style={{ flex: '1 1 300px', minWidth: '300px' }}>
                    <DashboardCard
                        title="Anketler"
                        description="Anketleri oluştur, düzenle ve sonuçları görüntüle"
                        icon="📝"
                        onClick={() => navigate('/business/surveys')}
                    />
                </div>
                <div style={{ flex: '1 1 300px', minWidth: '300px' }}>
                    <DashboardCard
                        title="Anket Yanıtları"
                        description="Müşterilerin ankete verdiği yanıtları görüntüle"
                        icon="📊"
                        onClick={() => navigate(`/business/${businessId}/responses`)}
                    />
                </div>
                <div style={{ flex: '1 1 300px', minWidth: '300px' }}>
                    <DashboardCard
                        title="Ödül Sistemi"
                        description="Ödülleri yönet ve puan sistemini düzenle"
                        icon="🏆"
                        onClick={() => navigate('/business/rewards')}
                    />
                </div>
                <div style={{ flex: '1 1 300px', minWidth: '300px' }}>
                    <DashboardCard
                        title="Müşteri Analizi"
                        description="Müşteri geri bildirimlerini analiz et ve raporları görüntüle"
                        icon="📈"
                        onClick={() => navigate('/business/analytics')}
                    />
                </div>
                <div style={{ flex: '1 1 300px', minWidth: '300px' }}>
                    <DashboardCard
                        title="Profil Yönetimi"
                        description="İşletme profilini görüntüle ve düzenle"
                        icon="👤"
                        onClick={() => navigate('/business/profile')}
                    />
                </div>
            </div>
        </div>
    );
};

const CustomerDashboard = () => {
    const navigate = useNavigate();
    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', margin: '24px 0' }}>
                <div style={{ flex: '1 1 300px', minWidth: '300px' }}>
                    <DashboardCard
                        title="Anketler"
                        description="Mevcut anketleri görüntüle ve katıl"
                        icon="📝"
                        onClick={() => navigate('/surveys')}
                    />
                </div>
                <div style={{ flex: '1 1 300px', minWidth: '300px' }}>
                    <DashboardCard
                        title="Ödüllerim"
                        description="Kazanılan puanları ve mevcut ödülleri görüntüle"
                        icon="🏆"
                        onClick={() => navigate('/rewards')}
                    />
                </div>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const { user } = useAuth();

    if (!user) return null;

    switch (user.role) {
        case UserRole.SUPER_ADMIN:
            return <SuperAdminDashboard />;
        case UserRole.BUSINESS_ADMIN:
            return <BusinessAdminDashboard />;
        case UserRole.CUSTOMER:
            return <CustomerDashboard />;
        default:
            return null;
    }
};

export default Dashboard;