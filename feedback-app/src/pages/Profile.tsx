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
    Alert,
    List,
    ListItem,
    ListItemText,
    Card,
    CardContent,
    Chip,
    Badge
} from '@mui/material';
import {
    Person as PersonIcon,
    Business as BusinessIcon,
    EmojiEvents as RewardIcon,
    Poll as SurveyIcon,
    Done as DoneIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/UserRole';
import api from '../services/api';
import moment from 'moment';

// Profil veri tipi
interface ProfileData {
    user: {
        _id: string;
        name: string;
        email: string;
        role: string;
        points: number;
        completedSurveys: SurveyInfo[];
        pointTransactions: PointTransaction[];
    };
    responses: ResponseInfo[];
}

// Anket bilgi tipi
interface SurveyInfo {
    _id: string;
    title: string;
    description: string;
    rewardPoints: number;
    createdAt: string;
}

// Yanıt bilgi tipi
interface ResponseInfo {
    _id: string;
    survey: {
        _id: string;
        title: string;
        description: string;
    };
    rewardPoints: number;
    createdAt: string;
}

// Puan işlem bilgi tipi
interface PointTransaction {
    amount: number;
    description: string;
    date: string;
}

const Profile: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
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
        // Kullanıcı profil bilgilerini yükle
        if (user) {
            fetchProfileData();

            // Form değerlerini doldur
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

    const fetchProfileData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/users/profile');

            if (response.data && response.data.success) {
                setProfileData(response.data.data);
                console.log('Profil verileri yüklendi:', response.data.data);

                // İşletme admin tarafından yapılan puan güncellemelerini göstermek için
                // kullanıcı puanlarını doğrudan API'den gelen değere göre ayarla
                const userPoints = response.data.data.user.points || 0;
                console.log('👤 Güncel müşteri puanları:', userPoints);

                // Profil verilerini güncelle
                setProfileData(prevData => {
                    if (!prevData) return response.data.data;
                    return {
                        ...prevData,
                        user: {
                            ...prevData.user,
                            points: userPoints
                        }
                    };
                });

                // Puan işlemlerini detaylı göster
                if (response.data.data.user.pointTransactions &&
                    response.data.data.user.pointTransactions.length > 0) {
                    console.log('👤 Son puan işlemleri:',
                        response.data.data.user.pointTransactions.slice(0, 5));
                }
            } else {
                setError('Profil verileri alınamadı');
            }
        } catch (err: any) {
            console.error('Profil verisi alma hatası:', err);
            setError(err.message || 'Profil verileri yüklenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

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

                            {profileData?.user?.points !== undefined && (
                                <Chip
                                    icon={<RewardIcon />}
                                    label={`${profileData.user.points} Puan`}
                                    color="primary"
                                    sx={{ mt: 2 }}
                                />
                            )}
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

                {/* Puanlar ve Katılınan Anketler - sadece CUSTOMER için göster */}
                {user.role === UserRole.CUSTOMER && (
                    <Paper sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                            <SurveyIcon sx={{ mr: 1 }} />
                            <Typography variant="h6">
                                Anket Geçmişi ve Kazanılan Puanlar
                            </Typography>
                        </Box>

                        {/* Güncel toplam puan bilgisi */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                mb: 3,
                                p: 2,
                                backgroundColor: 'primary.light',
                                borderRadius: 1
                            }}
                        >
                            <RewardIcon sx={{ fontSize: 36, color: 'white', mr: 2 }} />
                            <Box>
                                <Typography variant="subtitle2" color="white">
                                    Toplam Puanınız
                                </Typography>
                                <Typography variant="h4" fontWeight="bold" color="white">
                                    {profileData?.user?.points || 0}
                                </Typography>
                                <Typography variant="caption" color="white">
                                    Son güncelleme: {new Date().toLocaleTimeString()}
                                </Typography>
                            </Box>
                            <Box ml="auto">
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={fetchProfileData}
                                    disabled={loading}
                                    startIcon={loading ? <CircularProgress size={20} /> : <span role="img" aria-label="refresh">🔄</span>}
                                    size="small"
                                    sx={{ bgcolor: 'white', color: 'primary.main' }}
                                >
                                    Puanları Güncelle
                                </Button>
                            </Box>
                        </Box>

                        {/* Puan işlem geçmişi bölümü */}
                        {profileData?.user?.pointTransactions && profileData.user.pointTransactions.length > 0 && (
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6" gutterBottom>
                                    Puan İşlem Geçmişi
                                </Typography>
                                <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
                                    <List dense>
                                        {profileData.user.pointTransactions.map((transaction: any, index: number) => (
                                            <ListItem
                                                key={index}
                                                divider={index < profileData.user.pointTransactions.length - 1}
                                                sx={{
                                                    bgcolor: transaction.amount < 0 ? 'rgba(239, 83, 80, 0.05)' : 'rgba(76, 175, 80, 0.05)'
                                                }}
                                            >
                                                <ListItemText
                                                    primary={
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <Typography variant="body2" fontWeight="bold">
                                                                {transaction.amount < 0 ? 'Puan Kullanımı' : 'Puan Kazanımı'}
                                                            </Typography>
                                                            <Chip
                                                                size="small"
                                                                label={`${transaction.amount > 0 ? '+' : ''}${transaction.amount} puan`}
                                                                color={transaction.amount < 0 ? 'error' : 'success'}
                                                            />
                                                        </Box>
                                                    }
                                                    secondary={
                                                        <>
                                                            <Typography variant="caption" display="block">
                                                                {transaction.description || 'İşlem'}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {new Date(transaction.date).toLocaleString()}
                                                            </Typography>
                                                        </>
                                                    }
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Paper>
                            </Box>
                        )}

                        {loading ? (
                            <Box display="flex" justifyContent="center" my={3}>
                                <CircularProgress />
                            </Box>
                        ) : profileData?.responses && profileData.responses.length > 0 ? (
                            <Grid container spacing={2}>
                                {profileData.responses.map((response) => (
                                    <Grid item xs={12} sm={6} md={4} key={response._id}>
                                        <Card sx={{ height: '100%' }}>
                                            <CardContent>
                                                <Typography variant="h6" gutterBottom>
                                                    {response.survey.title}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                                    {response.survey.description?.length > 100
                                                        ? `${response.survey.description.substring(0, 100)}...`
                                                        : response.survey.description}
                                                </Typography>
                                                <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                                                    <Chip
                                                        icon={<RewardIcon />}
                                                        label={`${response.rewardPoints || 0} Puan`}
                                                        color="success"
                                                        size="small"
                                                    />
                                                    <Typography variant="caption" color="text.secondary">
                                                        {moment(response.createdAt).format('DD.MM.YYYY')}
                                                    </Typography>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        ) : (
                            <Alert severity="info">
                                Henüz hiç ankete katılmadınız. Ankete katılarak puanlar kazanabilirsiniz.
                            </Alert>
                        )}
                    </Paper>
                )}

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