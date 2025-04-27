import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/UserRole';

const Navbar: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <AppBar position="static">
            <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Geri Bildirim Uygulaması
                </Typography>
                <Box>
                    {isAuthenticated ? (
                        <>
                            <Button color="inherit" onClick={() => navigate('/')}>
                                Ana Sayfa
                            </Button>
                            {user?.role === UserRole.SUPER_ADMIN && (
                                <>
                                    <Button color="inherit" onClick={() => navigate('/admin')}>
                                        Admin Panel
                                    </Button>
                                    <Button color="inherit" onClick={() => navigate('/admin/businesses')}>
                                        İşletmeler
                                    </Button>
                                </>
                            )}
                            {user?.role === UserRole.BUSINESS_ADMIN && (
                                <>
                                    <Button color="inherit" onClick={() => navigate('/dashboard')}>
                                        İşletme Paneli
                                    </Button>
                                    <Button color="inherit" onClick={() => navigate('/business/surveys')}>
                                        Anketler
                                    </Button>
                                    <Button color="inherit" onClick={() => navigate('/business/profile')}>
                                        Profil
                                    </Button>
                                </>
                            )}
                            <Button color="inherit" onClick={handleLogout}>
                                Çıkış Yap
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button color="inherit" onClick={() => navigate('/login')}>
                                Giriş Yap
                            </Button>
                            <Button color="inherit" onClick={() => navigate('/register')}>
                                Kayıt Ol
                            </Button>
                        </>
                    )}
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Navbar; 