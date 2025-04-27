import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    Stack,
    Box,
    Avatar,
    Divider,
    Grid,
    CircularProgress,
    Alert
} from '@mui/material';
import { Person as PersonIcon, Business as BusinessIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/UserRole';

const Profile: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const [businessData, setBusinessData] = useState({
        name: '',
        address: '',
        phone: '',
        email: '',
        description: '',
        isApproved: false,
        isActive: false
    });

    useEffect(() => {
        // Kullanıcı verilerini form'a yükle
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: user.name || '',
                email: user.email || '',
                phone: '',
            }));

            // İşletme admin ise işletme verilerini getir
            if (user.role === UserRole.BUSINESS_ADMIN && user.business) {
                fetchBusinessData(user.business);
            }
        }
    }, [user]);

    const fetchBusinessData = async (businessId: string) => {
        setLoading(true);
        try {
            // TODO: Implement API call to fetch business data
            // For now, using mock data
            setBusinessData({
                name: 'ABC İşletmesi',
                address: 'İstanbul, Türkiye',
                phone: '+90 212 123 4567',
                email: 'info@abccompany.com',
                description: 'ABC İşletmesi müşteri memnuniyeti odaklı çalışmaktadır.',
                isApproved: true,
                isActive: true
            });
        } catch (err: any) {
            setError(err.message || 'İşletme bilgileri yüklenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleBusinessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBusinessData({
            ...businessData,
            [e.target.name]: e.target.value,
        });
    };

    const handleProfileUpdate = (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // TODO: Implement profile update logic
            console.log('Profile update:', formData);

            // Mock success response
            setTimeout(() => {
                setSuccess('Profil bilgileriniz başarıyla güncellendi.');
                setLoading(false);
            }, 1000);
        } catch (err: any) {
            setError(err.message || 'Profil güncellenirken bir hata oluştu');
            setLoading(false);
        }
    };

    const handleBusinessUpdate = (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // TODO: Implement business update logic
            console.log('Business update:', businessData);

            // Mock success response
            setTimeout(() => {
                setSuccess('İşletme bilgileri başarıyla güncellendi.');
                setLoading(false);
            }, 1000);
        } catch (err: any) {
            setError(err.message || 'İşletme bilgileri güncellenirken bir hata oluştu');
            setLoading(false);
        }
    };

    const handlePasswordUpdate = (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        // Şifre doğrulama
        if (formData.newPassword !== formData.confirmPassword) {
            setError('Yeni şifreler eşleşmiyor');
            setLoading(false);
            return;
        }

        if (formData.newPassword.length < 6) {
            setError('Şifre en az 6 karakter olmalıdır');
            setLoading(false);
            return;
        }

        try {
            // TODO: Implement password update logic
            console.log('Password update:', {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword,
            });

            // Mock success response
            setTimeout(() => {
                setSuccess('Şifreniz başarıyla güncellendi.');
                setFormData(prev => ({
                    ...prev,
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                }));
                setLoading(false);
            }, 1000);
        } catch (err: any) {
            setError(err.message || 'Şifre güncellenirken bir hata oluştu');
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Typography>Oturum açmanız gerekiyor.</Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Stack spacing={3}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Profil
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        {success}
                    </Alert>
                )}

                <Paper sx={{ p: 3 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4} display="flex" flexDirection="column" alignItems="center">
                            <Avatar
                                sx={{
                                    width: 120,
                                    height: 120,
                                    backgroundColor: 'primary.main',
                                    mb: 2
                                }}
                            >
                                <PersonIcon sx={{ fontSize: 80 }} />
                            </Avatar>
                            <Typography variant="subtitle1" gutterBottom>
                                {user.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {user.role === UserRole.SUPER_ADMIN
                                    ? 'Süper Admin'
                                    : user.role === UserRole.BUSINESS_ADMIN
                                        ? 'İşletme Yöneticisi'
                                        : 'Müşteri'}
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={8}>
                            <Typography variant="h6" gutterBottom>
                                Profil Bilgileri
                            </Typography>
                            <form onSubmit={handleProfileUpdate}>
                                <Stack spacing={2}>
                                    <TextField
                                        fullWidth
                                        label="Ad Soyad"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                    />
                                    <TextField
                                        fullWidth
                                        label="E-posta"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        disabled // Email değiştirilemez
                                    />
                                    <TextField
                                        fullWidth
                                        label="Telefon"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                    />
                                    <Box>
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            disabled={loading}
                                        >
                                            {loading ? <CircularProgress size={24} /> : 'Güncelle'}
                                        </Button>
                                    </Box>
                                </Stack>
                            </form>
                        </Grid>
                    </Grid>
                </Paper>

                {/* İşletme profili - sadece BUSINESS_ADMIN için göster */}
                {user.role === UserRole.BUSINESS_ADMIN && (
                    <Paper sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <BusinessIcon sx={{ mr: 1 }} />
                            <Typography variant="h6">
                                İşletme Bilgileri
                            </Typography>
                        </Box>
                        <form onSubmit={handleBusinessUpdate}>
                            <Stack spacing={2}>
                                <TextField
                                    fullWidth
                                    label="İşletme Adı"
                                    name="name"
                                    value={businessData.name}
                                    onChange={handleBusinessChange}
                                />
                                <TextField
                                    fullWidth
                                    label="Adres"
                                    name="address"
                                    value={businessData.address}
                                    onChange={handleBusinessChange}
                                />
                                <TextField
                                    fullWidth
                                    label="Telefon"
                                    name="phone"
                                    value={businessData.phone}
                                    onChange={handleBusinessChange}
                                />
                                <TextField
                                    fullWidth
                                    label="E-posta"
                                    name="email"
                                    type="email"
                                    value={businessData.email}
                                    onChange={handleBusinessChange}
                                />
                                <TextField
                                    fullWidth
                                    label="Açıklama"
                                    name="description"
                                    multiline
                                    rows={4}
                                    value={businessData.description}
                                    onChange={handleBusinessChange}
                                />
                                <Box>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        disabled={loading}
                                    >
                                        {loading ? <CircularProgress size={24} /> : 'İşletme Bilgilerini Güncelle'}
                                    </Button>
                                </Box>
                            </Stack>
                        </form>
                    </Paper>
                )}

                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Şifre Değiştir
                    </Typography>
                    <form onSubmit={handlePasswordUpdate}>
                        <Stack spacing={2}>
                            <TextField
                                fullWidth
                                label="Mevcut Şifre"
                                name="currentPassword"
                                type="password"
                                value={formData.currentPassword}
                                onChange={handleChange}
                                required
                            />
                            <TextField
                                fullWidth
                                label="Yeni Şifre"
                                name="newPassword"
                                type="password"
                                value={formData.newPassword}
                                onChange={handleChange}
                                required
                                helperText="En az 6 karakter olmalıdır"
                            />
                            <TextField
                                fullWidth
                                label="Yeni Şifre Tekrar"
                                name="confirmPassword"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                error={formData.newPassword !== formData.confirmPassword && formData.confirmPassword !== ''}
                                helperText={formData.newPassword !== formData.confirmPassword && formData.confirmPassword !== '' ? 'Şifreler eşleşmiyor' : ''}
                            />
                            <Box>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={loading}
                                >
                                    {loading ? <CircularProgress size={24} /> : 'Şifreyi Değiştir'}
                                </Button>
                            </Box>
                        </Stack>
                    </form>
                </Paper>
            </Stack>
        </Container>
    );
};

export default Profile; 