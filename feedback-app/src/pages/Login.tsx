import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Container,
    Box,
    Typography,
    TextField,
    Button,
    Paper,
    Link,
    Alert,
    CircularProgress,
    Avatar,
    Grid,
} from '@mui/material';
import authService from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>(
        (location.state as any)?.message || ''
    );
    const [apiStatus, setApiStatus] = useState<string>('Checking...');

    // Oturum durumunu kontrol et
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }

        // Sayfa yüklendiğinde önbelleği temizle
        const clearCache = () => {
            try {
                if ('caches' in window) {
                    caches.keys().then(names => {
                        names.forEach(name => {
                            caches.delete(name);
                        });
                    });
                }
                console.log('Önbellek temizlendi');
            } catch (err) {
                console.error('Önbellek temizleme hatası:', err);
            }
        };

        clearCache();
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        // Check API connectivity on component mount
        const checkApiStatus = async () => {
            try {
                console.log('Checking API status...');
                try {
                    // First try with the configured API (using proxy)
                    const response = await api.get('/debug');
                    console.log('API debug response:', response.data);
                    setApiStatus('Connected');
                    return; // Success, exit early
                } catch (initialError) {
                    console.warn('Initial API check failed, trying direct connection...');

                    // Try direct connection as fallback
                    const directResponse = await fetch('http://localhost:5000/debug');
                    if (directResponse.ok) {
                        const data = await directResponse.json();
                        console.log('Direct API connection successful:', data);
                        setApiStatus('Connected (direct)');

                        // Update future API calls to use direct URL
                        api.defaults.baseURL = 'http://localhost:5000';
                        console.log('Updated API baseURL to:', api.defaults.baseURL);
                        return; // Success with direct connection
                    }
                }

                // If we get here, both approaches failed
                throw new Error('Could not connect to API server');
            } catch (error: any) {
                console.error('API status check failed:', error);
                setApiStatus('Error connecting to API');
            }
        };

        checkApiStatus();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        // Kullanıcı form alanlarını değiştirdiğinde mesajları temizle
        setError('');
        setSuccessMessage('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        // Basit form doğrulama
        if (!formData.email || !formData.password) {
            setError('Lütfen e-posta ve şifre alanlarını doldurun.');
            setLoading(false);
            return;
        }

        try {
            console.log('Giriş yapılıyor...', { email: formData.email });

            // Konsol logunu temizle 
            console.clear();
            console.log('Giriş isteği gönderiliyor:', { email: formData.email });

            const response = await authService.login({
                email: formData.email,
                password: formData.password,
            });

            console.log('Giriş yanıtı alındı:', {
                tokenVarMi: !!response.token,
                kullaniciVarMi: !!response.user,
                rol: response.user?.role
            });

            // Yanıt kontrolü
            if (!response || !response.token || !response.user) {
                throw new Error('Geçersiz yanıt formatı');
            }

            // SuperAdmin girişi için ekstra log
            if (response.user.role === 'SUPER_ADMIN') {
                console.log('SuperAdmin giriş yanıtı:', {
                    id: response.user._id,
                    name: response.user.name,
                    role: response.user.role
                });
            }

            console.log('Giriş başarılı, kullanıcı bilgileri:', {
                id: response.user._id,
                name: response.user.name,
                role: response.user.role
            });

            const { token, user } = response;

            // Kısa bir gecikme ile oturum açma - sonsuz yönlendirme döngüsünü önler
            setTimeout(() => {
                console.log('Login bilgileri kaydediliyor...', { token: token.substring(0, 15) + '...' });
                login(token, user);

                console.log('Yönlendirme yapılıyor...');

                // Rol bazlı yönlendirme
                if (user.role === 'SUPER_ADMIN') {
                    navigate('/admin', { replace: true });
                } else if (user.role === 'BUSINESS_ADMIN') {
                    navigate('/dashboard', { replace: true });
                } else if (user.role === 'CUSTOMER') {
                    navigate('/customer', { replace: true });
                } else {
                    navigate('/', { replace: true });
                }
            }, 300);
        } catch (error: any) {
            console.error('Login error:', error);

            // Detaylı hata mesajı göster
            let errorMessage = 'Giriş yapma işlemi başarısız oldu.';

            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Paper elevation={3} sx={{ p: 4, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
                        <LockOutlinedIcon />
                    </Avatar>
                    <Typography component="h1" variant="h5">
                        Giriş Yap
                    </Typography>

                    {successMessage && (
                        <Alert severity="success" sx={{ width: '100%', mt: 2 }}>
                            {successMessage}
                        </Alert>
                    )}

                    {error && (
                        <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <Typography variant="caption" color={apiStatus === 'Connected' || apiStatus === 'Connected (direct)' ? 'success.main' : 'error.main'} sx={{ mt: 1 }}>
                        API Status: {apiStatus}
                    </Typography>

                    {apiStatus.includes('Error') && (
                        <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            sx={{ mt: 1, mb: 1 }}
                            onClick={async () => {
                                setApiStatus('Trying direct connection...');
                                try {
                                    const response = await fetch('http://localhost:5000/api/debug');
                                    if (response.ok) {
                                        const data = await response.json();
                                        console.log('Manual check successful:', data);
                                        setApiStatus('Connected via manual check');
                                        api.defaults.baseURL = 'http://localhost:5000';
                                    } else {
                                        setApiStatus(`Error: Server responded with ${response.status}`);
                                    }
                                } catch (error: any) {
                                    console.error('Manual check failed:', error);
                                    setApiStatus(`Manual check failed: ${error.message}`);
                                }
                            }}
                        >
                            Test Direct Connection
                        </Button>
                    )}

                    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="E-posta"
                            name="email"
                            autoComplete="email"
                            autoFocus
                            value={formData.email}
                            onChange={handleChange}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Şifre"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            value={formData.password}
                            onChange={handleChange}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={20} /> : null}
                        >
                            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                        </Button>
                        <Grid container>
                            <Grid item xs>
                                <Link href="#" variant="body2">
                                    Şifremi unuttum
                                </Link>
                            </Grid>
                            <Grid item>
                                <Link href="/register" variant="body2">
                                    Hesabınız yok mu? Kayıt ol
                                </Link>
                            </Grid>
                        </Grid>
                    </Box>
                </Paper>
            </Box>
        </Container>
    );
};

export default Login; 