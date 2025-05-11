import React, { useState, useRef } from 'react';
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

interface Question {
    _id: string;
    text: string;
    type: string;
    options?: string[];
    required: boolean;
}

interface Survey {
    _id: string;
    title: string;
    description: string;
    questions: Question[];
}

interface Business {
    _id: string;
    name: string;
    isActive?: boolean;
}

const DevTools: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout, setUser } = useAuth();
    const [businessIdInput, setBusinessIdInput] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loadingBusinesses, setLoadingBusinesses] = useState(false);
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loadingSurveys, setLoadingSurveys] = useState(false);

    const handleUpdateBusinessId = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!businessIdInput || businessIdInput.length !== 24) {
            setMessage({ type: 'error', text: 'Lütfen geçerli bir işletme ID girin (24 karakter)' });
            return;
        }

        // 'undefined' ve 'null' değerlerini reddet
        if (businessIdInput === 'undefined' || businessIdInput === 'null') {
            setMessage({ type: 'error', text: 'Lütfen geçerli bir işletme ID girin. "undefined" veya "null" değeri kullanılamaz.' });
            return;
        }

        try {
            // Önce bu işletme ID'sinin gerçekten var olduğunu doğrulayalım
            try {
                const businessResponse = await api.get(`/businesses/${businessIdInput}`);
                if (!businessResponse.data || !businessResponse.data._id) {
                    setMessage({ type: 'error', text: 'Belirtilen ID ile işletme bulunamadı' });
                    return;
                }
                console.log('İşletme doğrulandı:', businessResponse.data.name);
            } catch (error: any) {
                console.error('İşletme doğrulama hatası:', error);
                setMessage({
                    type: 'error',
                    text: 'Bu işletme ID doğrulanamadı. Lütfen mevcut bir işletme ID\'si kullanın.'
                });
                return;
            }

            // Yerel depolamada kullanıcı bilgilerini güncelle
            const userJson = localStorage.getItem('user');
            if (userJson) {
                const userData = JSON.parse(userJson);
                userData.business = businessIdInput;
                localStorage.setItem('user', JSON.stringify(userData));

                // Kullanıcı state'ini güncelle
                setUser({
                    ...user!,
                    business: businessIdInput
                });

                setMessage({
                    type: 'success',
                    text: 'İşletme ID başarıyla güncellendi. Değişikliklerin etkili olması için sayfayı yenileyebilirsiniz.'
                });
            } else {
                setMessage({
                    type: 'error',
                    text: 'Kullanıcı bilgileri bulunamadı. Lütfen tekrar giriş yapın.'
                });
            }
        } catch (error: any) {
            console.error('İşletme ID güncellenirken hata:', error);
            setMessage({
                type: 'error',
                text: `İşletme ID güncellenirken bir hata oluştu: ${error.message}`
            });
        }
    };

    const fetchBusinesses = async () => {
        try {
            setLoadingBusinesses(true);
            setMessage(null);
            const response = await api.get('/businesses');
            if (response.data && Array.isArray(response.data)) {
                setBusinesses(response.data);
                setMessage({
                    type: 'success',
                    text: `${response.data.length} işletme listelendi. İşletme ID'sini seçin ve "İşletme ID'sini Güncelle" butonuna tıklayın.`
                });
            } else {
                setMessage({
                    type: 'error',
                    text: 'İşletmeler listelenemedi: Beklenmeyen API yanıtı'
                });
            }
        } catch (error: any) {
            console.error('İşletmeleri listelerken hata:', error);
            setMessage({
                type: 'error',
                text: `İşletmeler listelenemedi: ${error.message || 'Bilinmeyen hata'}`
            });
        } finally {
            setLoadingBusinesses(false);
        }
    };

    const fetchSurveys = async () => {
        try {
            setLoadingSurveys(true);
            setMessage(null);

            // Kullanıcı işletmesine ait anketleri getir
            if (!user?.business) {
                setMessage({
                    type: 'error',
                    text: 'İşletme ID bulunamadı. Lütfen önce İşletme ID\'nizi ayarlayın.'
                });
                return;
            }

            const response = await api.get(`/surveys/business/${user.business}`);
            if (response.data && Array.isArray(response.data)) {
                setSurveys(response.data);
                setMessage({
                    type: 'success',
                    text: `${response.data.length} anket bulundu. İşletmenize ait aktif anketleri görüntüleyebilirsiniz.`
                });
            } else {
                setMessage({
                    type: 'error',
                    text: 'Anketler listelenemedi: Beklenmeyen API yanıtı'
                });
            }
        } catch (error: any) {
            console.error('Anketleri listelerken hata:', error);
            setMessage({
                type: 'error',
                text: `Anketler listelenemedi: ${error.message || 'Bilinmeyen hata'}`
            });
        } finally {
            setLoadingSurveys(false);
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

            setMessage({
                type: 'info',
                text: `Token: ${tokenInfo}\n\nKullanıcı Detayları:\n${userDetails}`
            });
        } catch (error) {
            console.error('LocalStorage bilgileri gösterilirken hata:', error);
            setMessage({
                type: 'error',
                text: 'Bilgiler gösterilirken hata oluştu'
            });
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
                Bu sayfa, işletme ID'nizi yapılandırmanıza ve gerçek verilerle çalışmanıza yardımcı olur.
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
                        <Typography variant="body2">
                            <strong>İşletme ID:</strong> {
                                !user?.business ? (
                                    <span style={{ color: 'red' }}>Yok - İşletme yanıtlarını görebilmek için bir işletme seçmelisiniz</span>
                                ) : user.business === 'undefined' ? (
                                    <span style={{ color: 'red' }}>Geçersiz (undefined) - Lütfen geçerli bir işletme seçin</span>
                                ) : (
                                    user.business
                                )
                            }
                        </Typography>
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
                        İşletmeleri Listele
                    </Typography>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Bu araç, sistemdeki mevcut işletmeleri listeleyerek doğru işletme ID'sini bulmanıza yardımcı olur.
                    </Alert>

                    <Button
                        variant="contained"
                        color="primary"
                        onClick={fetchBusinesses}
                        disabled={loadingBusinesses}
                        sx={{ mb: 2 }}
                    >
                        {loadingBusinesses ? 'İşletmeler Yükleniyor...' : 'İşletmeleri Listele'}
                    </Button>

                    {businesses.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Sistemdeki İşletmeler:
                            </Typography>
                            <Paper sx={{ maxHeight: 300, overflow: 'auto', p: 2 }}>
                                {businesses.map((business) => (
                                    <Box
                                        key={business._id}
                                        sx={{
                                            p: 1,
                                            borderBottom: '1px solid #eee',
                                            '&:hover': { bgcolor: 'action.hover', cursor: 'pointer' }
                                        }}
                                        onClick={() => setBusinessIdInput(business._id)}
                                    >
                                        <Typography variant="body2">
                                            <strong>İşletme:</strong> {business.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>ID:</strong> {business._id}
                                        </Typography>
                                        {business.isActive !== undefined && (
                                            <Typography variant="body2" color={business.isActive ? 'success.main' : 'error.main'}>
                                                {business.isActive ? 'Aktif' : 'Pasif'}
                                            </Typography>
                                        )}
                                    </Box>
                                ))}
                            </Paper>
                        </Box>
                    )}
                </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        İşletme ID Güncelleme
                    </Typography>

                    <Alert severity="info" sx={{ mb: 2 }}>
                        Bu araç, kullanıcı hesabınızla ilişkilendirilmiş işletme ID'sini güncellemenizi sağlar.
                        İşletme yanıtlarını görebilmeniz için doğru bir işletme ID'sine ihtiyacınız var.
                    </Alert>

                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Mevcut işletme ID: <strong>{user?.business || 'Tanımlanmamış'}</strong>
                    </Typography>

                    <Box component="form" onSubmit={handleUpdateBusinessId} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="İşletme ID"
                            variant="outlined"
                            value={businessIdInput}
                            onChange={(e) => setBusinessIdInput(e.target.value)}
                            fullWidth
                            required
                            helperText="Yukarıdan bir işletme seçebilir veya geçerli bir MongoDB ObjectId (24 karakter) girebilirsiniz"
                        />

                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={!businessIdInput || businessIdInput.length !== 24}
                        >
                            İşletme ID'sini Güncelle
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        İşletme Anketlerini Görüntüle
                    </Typography>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Bu araç, işletmenizin mevcut anketlerini gösterir. Gerçek anket verileri üzerinden işlem yapabilirsiniz.
                    </Alert>

                    <Button
                        variant="outlined"
                        color="primary"
                        onClick={fetchSurveys}
                        disabled={loadingSurveys}
                        sx={{ mb: 2, mr: 2 }}
                    >
                        {loadingSurveys ? 'Anketler Yükleniyor...' : 'İşletme Anketlerini Görüntüle'}
                    </Button>

                    {surveys.length > 0 && (
                        <Box sx={{ mt: 2, mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                İşletme Anketleri:
                            </Typography>
                            <Paper sx={{ maxHeight: 200, overflow: 'auto', p: 2 }}>
                                {surveys.map((survey) => (
                                    <Box
                                        key={survey._id}
                                        sx={{
                                            p: 1,
                                            borderBottom: '1px solid #eee',
                                            '&:hover': { bgcolor: 'action.hover', cursor: 'pointer' }
                                        }}
                                        onClick={() => navigate(`/survey/${survey._id}/responses`)}
                                    >
                                        <Typography variant="body2">
                                            <strong>Anket:</strong> {survey.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>ID:</strong> {survey._id}
                                        </Typography>
                                        <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/survey/${survey._id}/responses`);
                                                }}
                                            >
                                                Yanıtları Görüntüle
                                            </Button>
                                        </Typography>
                                    </Box>
                                ))}
                            </Paper>
                        </Box>
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