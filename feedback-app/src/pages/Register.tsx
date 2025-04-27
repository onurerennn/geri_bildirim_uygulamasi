import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import authService from '../services/authService';
import { UserRole } from '../types/UserRole';

const Register: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState<string>('');
    const [fieldErrors, setFieldErrors] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    const validateForm = () => {
        let isValid = true;
        const errors = {
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
        };

        // Ad kontrolü
        if (!formData.name.trim()) {
            errors.name = 'Ad Soyad alanı zorunludur';
            isValid = false;
        }

        // E-posta kontrolü
        if (!formData.email) {
            errors.email = 'E-posta alanı zorunludur';
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = 'Geçerli bir e-posta adresi giriniz';
            isValid = false;
        }

        // Şifre kontrolü
        if (!formData.password) {
            errors.password = 'Şifre alanı zorunludur';
            isValid = false;
        } else if (formData.password.length < 6) {
            errors.password = 'Şifre en az 6 karakter olmalıdır';
            isValid = false;
        }

        // Şifre tekrar kontrolü
        if (!formData.confirmPassword) {
            errors.confirmPassword = 'Şifre tekrar alanı zorunludur';
            isValid = false;
        } else if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = 'Şifreler eşleşmiyor';
            isValid = false;
        }

        setFieldErrors(errors);
        return isValid;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
        // Kullanıcı yazmaya başladığında hata mesajını temizle
        setFieldErrors(prev => ({
            ...prev,
            [name]: '',
        }));
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { token, user } = await authService.register({
                name: formData.name.trim(),
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                role: UserRole.CUSTOMER,
            });

            // Başarılı kayıt sonrası
            console.log('Kayıt başarılı:', { token, user });
            navigate('/login', {
                state: {
                    message: 'Kayıt işleminiz başarıyla tamamlandı! Şimdi e-posta ve şifrenizle giriş yapabilirsiniz.'
                }
            });
        } catch (error: any) {
            console.error('Kayıt hatası:', error);
            setError(
                error.response?.data?.message ||
                'Kayıt olma işlemi başarısız oldu. Lütfen tekrar deneyin.'
            );
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
                <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
                    <Typography component="h1" variant="h5" align="center">
                        Kayıt Ol
                    </Typography>
                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="name"
                            label="Ad Soyad"
                            name="name"
                            autoComplete="name"
                            autoFocus
                            value={formData.name}
                            onChange={handleChange}
                            error={!!fieldErrors.name}
                            helperText={fieldErrors.name}
                            disabled={loading}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="E-posta Adresi"
                            name="email"
                            autoComplete="email"
                            value={formData.email}
                            onChange={handleChange}
                            error={!!fieldErrors.email}
                            helperText={fieldErrors.email}
                            disabled={loading}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Şifre"
                            type="password"
                            id="password"
                            value={formData.password}
                            onChange={handleChange}
                            error={!!fieldErrors.password}
                            helperText={fieldErrors.password}
                            disabled={loading}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="confirmPassword"
                            label="Şifre Tekrar"
                            type="password"
                            id="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            error={!!fieldErrors.confirmPassword}
                            helperText={fieldErrors.confirmPassword}
                            disabled={loading}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2, height: 48 }}
                            disabled={loading}
                        >
                            {loading ? (
                                <CircularProgress size={24} color="inherit" />
                            ) : (
                                'Kayıt Ol'
                            )}
                        </Button>
                        <Box sx={{ textAlign: 'center' }}>
                            <Link
                                href="/login"
                                variant="body2"
                                sx={{
                                    cursor: 'pointer',
                                    textDecoration: 'none',
                                    '&:hover': {
                                        textDecoration: 'underline'
                                    }
                                }}
                            >
                                Zaten hesabınız var mı? Giriş yapın
                            </Link>
                        </Box>
                    </Box>
                </Paper>
            </Box>
        </Container>
    );
};

export default Register; 