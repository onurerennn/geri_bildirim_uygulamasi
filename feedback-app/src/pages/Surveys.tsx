import React, { useEffect, useState } from 'react';
import {
    Container,
    Card,
    CardContent,
    CardActions,
    Typography,
    Button,
    IconButton,
    Box,
    Fab,
    CircularProgress,
    Alert,
    Link,
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    QrCode as QrCodeIcon,
    Add as AddIcon,
    Settings as SettingsIcon,
    Error as ErrorIcon,
    Refresh as RefreshIcon,
    BarChart as BarChartIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import surveyService from '../services/surveyService';

interface Survey {
    _id: string;
    title: string;
    description: string;
    business: string;
    createdAt: string;
    questions: any[];
    qrCodes?: any[];
}

const Surveys: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSurveys = async () => {
        try {
            setLoading(true);
            setError(null);

            // Debug user information
            console.log('Current user in Surveys component:', {
                userId: user?._id,
                userName: user?.name,
                userRole: user?.role,
                business: user?.business,
                needsBusinessConfig: user?.needsBusinessConfig
            });

            // If user has needsBusinessConfig flag, redirect to DevTools
            if (user?.needsBusinessConfig) {
                console.log('Kullanıcı işletme yapılandırmasına ihtiyaç duyuyor, DevTools sayfasına yönlendiriliyor');
                navigate('/dev-tools');
                return;
            }

            // Only fetch surveys for the current business
            if (!user?.business) {
                console.error('Business information is missing in user object:', user);
                setError('İşletme bilgisi bulunamadı. Lütfen işletme ID\'nizi güncelleyin.');
                setLoading(false);
                return;
            }

            const businessId = user.business;
            console.log(`Fetching surveys for business ID: ${businessId}`);

            try {
                console.log('API\'den anketler getiriliyor...');
                const data = await surveyService.getBusinessSurveys();

                if (data && data.length > 0) {
                    console.log(`✅ ${data.length} anket başarıyla alındı.`);
                    setSurveys(data);
                } else {
                    console.log("Hiç anket bulunamadı");
                    setSurveys([]);
                    setError('Henüz anket eklenmemiş. Yeni anket oluşturabilirsiniz.');
                }
            } catch (error) {
                console.error("❌ Anketler getirilirken hata:", error);
                setSurveys([]);
                setError('Anketler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
            }

            setLoading(false);
        } catch (err: any) {
            console.error('Error fetching surveys:', err);
            console.error('Error details:', {
                message: err.message,
                statusCode: err.response?.status,
                responseData: err.response?.data,
                config: err.config
            });

            let errorMessage = 'Anketler yüklenirken bir hata oluştu';

            if (err.response?.status === 401) {
                errorMessage = 'Oturum süresi dolmuş olabilir. Lütfen tekrar giriş yapın.';
            } else if (err.response?.status === 403) {
                errorMessage = 'Bu işlem için yetkiniz bulunmamaktadır.';
            } else if (err.response?.status === 404) {
                errorMessage = 'İşletme veya anket bilgisi bulunamadı.';
            } else if (err.response?.data?.error) {
                errorMessage = err.response.data.error;
            }

            setError(errorMessage);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSurveys();
    }, [user]);

    const handleDeleteSurvey = async (surveyId: string) => {
        if (window.confirm('Bu anketi silmek istediğinizden emin misiniz?')) {
            try {
                // Include /api prefix in the URL
                await api.delete(`/surveys/${surveyId}`);
                // Remove the deleted survey from the state
                setSurveys(surveys.filter(survey => survey._id !== surveyId));
            } catch (err: any) {
                console.error('Anket silinirken hata oluştu:', err);
                alert('Anket silinirken bir hata oluştu');
            }
        }
    };

    // Render a message for missing business ID
    const renderMissingBusinessIdMessage = () => (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
            <ErrorIcon sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
                İşletme Bilgisi Eksik
            </Typography>
            <Typography variant="body1" paragraph>
                Hesabınızda işletme bilgisi eksik veya geçersiz. Bu nedenle anketlerinizi görüntüleyemiyoruz.
            </Typography>
            <Typography variant="body2" paragraph sx={{ color: 'text.secondary' }}>
                Devam etmek için bir işletme ID'si seçmeniz gerekiyor. Aşağıdaki butona tıklayarak bir işletme seçebilirsiniz.
            </Typography>
            <Button
                variant="contained"
                color="primary"
                startIcon={<SettingsIcon />}
                onClick={() => navigate('/dev-tools')}
                sx={{ mt: 2 }}
                size="large"
            >
                İşletme Seçmek İçin Tıklayın
            </Button>
        </Box>
    );

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {/* If user needs business config, show message and redirect */}
            {user?.needsBusinessConfig ? (
                renderMissingBusinessIdMessage()
            ) : (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                        <Typography variant="h4" component="h1" gutterBottom>
                            Anketleriniz
                        </Typography>
                        <Box>
                            <Button
                                variant="outlined"
                                color="secondary"
                                sx={{ mr: 2 }}
                                startIcon={<BarChartIcon />}
                                onClick={() => navigate(`/business/${user?.business}/responses`)}
                                disabled={!user?.business}
                            >
                                Tüm Yanıtları Görüntüle
                            </Button>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<AddIcon />}
                                onClick={() => navigate('/business/surveys/new')}
                                disabled={!user?.business}
                            >
                                Yeni Anket Oluştur
                            </Button>
                        </Box>
                    </Box>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : error ? (
                        error.includes('işletme bilgisi') ?
                            renderMissingBusinessIdMessage() :
                            <Alert severity="error" action={
                                <Button
                                    color="inherit"
                                    size="small"
                                    onClick={() => navigate('/dev-tools')}
                                >
                                    Geliştirici Araçlarını Aç
                                </Button>
                            }>
                                {error}
                            </Alert>
                    ) : surveys.length === 0 ? (
                        <Alert severity="info">
                            Henüz hiç anket oluşturmadınız. Yeni anket eklemek için sağ üstteki "+" butonuna tıklayın.
                        </Alert>
                    ) : (
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
                            {surveys.map((survey) => (
                                <Card key={survey._id}>
                                    <CardContent>
                                        <Typography variant="h6" component="h2">
                                            {survey.title}
                                        </Typography>
                                        <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                                            {survey.description}
                                        </Typography>
                                        <Typography variant="body2">
                                            Soru Sayısı: {survey.questions?.length || 0}
                                        </Typography>
                                        <Typography variant="body2">
                                            QR Kod Sayısı: {survey.qrCodes?.length || 0}
                                        </Typography>
                                        <Typography variant="body2">
                                            Oluşturulma: {new Date(survey.createdAt).toLocaleDateString('tr-TR')}
                                        </Typography>
                                    </CardContent>
                                    <CardActions>
                                        <IconButton size="small" color="primary" onClick={() => navigate(`/business/surveys/edit/${survey._id}`)}>
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton size="small" color="primary" onClick={() => navigate(`/business/surveys/${survey._id}/qr-codes`)}>
                                            <QrCodeIcon />
                                        </IconButton>
                                        <IconButton size="small" color="error" onClick={() => handleDeleteSurvey(survey._id)}>
                                            <DeleteIcon />
                                        </IconButton>
                                        <Button size="small" color="primary" sx={{ marginLeft: 'auto' }} onClick={() => navigate(`/business/surveys/${survey._id}`)}>
                                            Detaylar
                                        </Button>
                                    </CardActions>
                                </Card>
                            ))}
                        </Box>
                    )}
                </>
            )}
        </Container>
    );
};

export default Surveys; 