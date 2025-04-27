import React, { useState } from 'react';
import {
    Container,
    Typography,
    Box,
    Button,
    TextField,
    Card,
    CardContent,
    Alert,
    Divider,
    Paper
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const DevTools: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [businessId, setBusinessId] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [isCreatingBusiness, setIsCreatingBusiness] = useState(false);

    const handleUpdateBusinessId = () => {
        try {
            if (!businessId || !businessId.match(/^[0-9a-fA-F]{24}$/)) {
                setMessage({ type: 'error', text: 'Lütfen geçerli bir MongoDB ObjectId formatında business ID giriniz' });
                return;
            }

            // Get current user data
            const userData = localStorage.getItem('user');
            if (!userData) {
                setMessage({ type: 'error', text: 'Kullanıcı verisi bulunamadı' });
                return;
            }

            // Parse and update
            const parsedUser = JSON.parse(userData);
            parsedUser.business = businessId;

            // Save back to localStorage
            localStorage.setItem('user', JSON.stringify(parsedUser));

            setMessage({ type: 'success', text: 'İşletme ID başarıyla güncellendi. Değişikliklerin etkili olması için sayfayı yenileyin.' });
        } catch (error) {
            console.error('İşletme ID güncellenirken hata:', error);
            setMessage({ type: 'error', text: 'İşletme ID güncellenirken bir hata oluştu' });
        }
    };

    const createDefaultBusiness = async () => {
        try {
            setIsCreatingBusiness(true);
            const response = await api.post('/api/businesses/create-default');

            if (response.data && response.data.businessId) {
                setBusinessId(response.data.businessId);
                setMessage({
                    type: 'success',
                    text: `Demo işletme oluşturuldu! ID: ${response.data.businessId}. 
                    Bu ID'yi yukarıdaki input'a kopyaladık, "Güncelle" butonuna tıklayarak kullanıcınıza atayabilirsiniz.`
                });
            } else {
                setMessage({ type: 'error', text: 'İşletme oluşturulurken bir hata oluştu: ID alınamadı' });
            }
        } catch (error: any) {
            console.error('Demo işletme oluşturulurken hata:', error);
            setMessage({
                type: 'error',
                text: `Demo işletme oluşturulurken hata: ${error.response?.data?.message || error.message}`
            });
        } finally {
            setIsCreatingBusiness(false);
        }
    };

    const showStorageInfo = () => {
        try {
            const tokenInfo = localStorage.getItem('token') ? 'Var' : 'Yok';
            const userInfo = localStorage.getItem('user');
            const parsedUser = userInfo ? JSON.parse(userInfo) : null;

            let userDetails = 'Kullanıcı verisi yok';
            if (parsedUser) {
                userDetails = `
                ID: ${parsedUser._id || 'Yok'}
                Email: ${parsedUser.email || 'Yok'}
                Role: ${parsedUser.role || 'Yok'}
                Business: ${parsedUser.business || 'Yok'}
                `;
            }

            alert(`Token: ${tokenInfo}\n\nKullanıcı Detayları:\n${userDetails}`);
        } catch (error) {
            console.error('LocalStorage bilgileri gösterilirken hata:', error);
            alert('Bilgiler gösterilirken hata oluştu');
        }
    };

    const clearStorage = () => {
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setMessage({ type: 'info', text: 'LocalStorage temizlendi. Sayfa yenilenecek.' });
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            console.error('LocalStorage temizlenirken hata:', error);
            setMessage({ type: 'error', text: 'LocalStorage temizlenirken hata oluştu' });
        }
    };

    return (
        <Container maxWidth="md" sx={{ mt: 5 }}>
            <Typography variant="h4" gutterBottom>
                Geliştirici Araçları
            </Typography>
            <Typography color="text.secondary" paragraph>
                Bu sayfa sadece geliştirme aşamasında kullanılmak üzere tasarlanmıştır.
            </Typography>

            {message && (
                <Alert severity={message.type} sx={{ my: 2 }} onClose={() => setMessage(null)}>
                    {message.text}
                </Alert>
            )}

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Mevcut Kullanıcı Bilgileri
                    </Typography>
                    <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, mb: 2 }}>
                        <Typography variant="body2"><strong>ID:</strong> {user?._id || 'Yok'}</Typography>
                        <Typography variant="body2"><strong>İsim:</strong> {user?.name || 'Yok'}</Typography>
                        <Typography variant="body2"><strong>Email:</strong> {user?.email || 'Yok'}</Typography>
                        <Typography variant="body2"><strong>Rol:</strong> {user?.role || 'Yok'}</Typography>
                        <Typography variant="body2"><strong>İşletme ID:</strong> {user?.business || 'Yok'}</Typography>
                    </Box>
                    <Button variant="outlined" onClick={showStorageInfo} sx={{ mr: 1 }}>
                        LocalStorage Bilgilerini Göster
                    </Button>
                    <Button variant="outlined" color="error" onClick={clearStorage}>
                        LocalStorage Temizle
                    </Button>
                </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        İşletme ID Güncelleme
                    </Typography>
                    <Typography color="text.secondary" paragraph>
                        BUSINESS_ADMIN rolündeki kullanıcılar için eksik işletme ID'sini düzeltir.
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <TextField
                            label="Business ID"
                            variant="outlined"
                            fullWidth
                            value={businessId}
                            onChange={(e) => setBusinessId(e.target.value)}
                            placeholder="MongoDB ObjectId formatında (24 karakter)"
                            size="small"
                            sx={{ mr: 2 }}
                        />
                        <Button
                            variant="contained"
                            onClick={handleUpdateBusinessId}
                            disabled={!businessId}
                        >
                            Güncelle
                        </Button>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                        Not: Güncelleme sonrası değişikliklerin etkili olması için sayfayı yenilemeniz gerekebilir.
                    </Typography>
                </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Demo İşletme Oluştur
                    </Typography>
                    <Typography color="text.secondary" paragraph>
                        Geliştirme amaçlı bir demo işletme oluşturur ve ID'sini alır.
                    </Typography>
                    <Button
                        variant="contained"
                        color="secondary"
                        onClick={createDefaultBusiness}
                        disabled={isCreatingBusiness}
                    >
                        {isCreatingBusiness ? 'İşletme Oluşturuluyor...' : 'Demo İşletme Oluştur'}
                    </Button>

                    {user?.role !== 'BUSINESS_ADMIN' && (
                        <Paper sx={{ mt: 2, p: 2, bgcolor: 'warning.light' }}>
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                Not: BUSINESS_ADMIN rolündeki kullanıcı hesapları işletme ID'ye ihtiyaç duyar.
                                Mevcut rolünüz: {user?.role || 'Bilinmiyor'}
                            </Typography>
                        </Paper>
                    )}
                </CardContent>
            </Card>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button
                    variant="outlined"
                    onClick={() => navigate('/business/surveys')}
                >
                    Anketler Sayfasına Dön
                </Button>

                <Button
                    variant="contained"
                    color="error"
                    onClick={() => {
                        logout();
                        window.location.href = '/login';
                    }}
                >
                    Çıkış Yap
                </Button>
            </Box>
        </Container>
    );
};

export default DevTools; 