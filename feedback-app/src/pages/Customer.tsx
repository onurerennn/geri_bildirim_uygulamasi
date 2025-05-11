import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Paper,
    Grid,
    Rating,
    TextField,
    Button,
    Box,
    Alert,
    CircularProgress,
    Card,
    CardContent,
    Divider,
    Tabs,
    Tab
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { surveyService } from '../services/surveyService';
import { useSnackbar } from '../contexts/SnackbarContext';
import { Survey } from '../types/Survey';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import api from '../services/api';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const Customer = () => {
    const { user } = useAuth();
    const { showSnackbar } = useSnackbar();
    const navigate = useNavigate();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [feedback, setFeedback] = useState({
        rating: 0,
        comment: ''
    });
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [tabValue, setTabValue] = useState(0);
    const [qrCodeInput, setQrCodeInput] = useState('');
    const [scanLoading, setScanLoading] = useState(false);

    console.log('Customer component rendered', { user });

    useEffect(() => {
        console.log('Customer component mounted');
        fetchSurveys();
    }, []);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const fetchSurveys = async () => {
        try {
            setLoading(true);
            setError(''); // Hata durumunu sıfırla
            console.log('Müşteri sayfası: Anketler yükleniyor...');
            const response = await surveyService.getActiveSurveys();

            if (!response || !Array.isArray(response)) {
                console.error('Geçersiz yanıt formatı:', response);
                setError('Sunucudan geçersiz veri formatı alındı.');
                setSurveys([]);
            } else {
                console.log('Yüklenen anket sayısı:', response.length);
                setSurveys(response);
            }
        } catch (error: any) {
            console.error('Error fetching surveys:', error);
            setSurveys([]);
            if (error.response) {
                setError(`Anketler yüklenirken hata: ${error.response.status} - ${error.response.data.message || 'Bilinmeyen hata'}`);
            } else if (error.request) {
                setError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
            } else {
                setError(`Anketler yüklenirken bir hata oluştu: ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitFeedback = async (surveyId: string) => {
        try {
            setLoading(true);
            setError('');
            console.log('Geri bildirim gönderiliyor...', { surveyId, feedback });

            // Find the current survey by ID
            const currentSurvey = surveys.find(s => s._id === surveyId);
            if (!currentSurvey) {
                setError('Anket bulunamadı');
                setLoading(false);
                return;
            }

            // Make sure there are at least 2 questions in the survey
            if (!currentSurvey.questions || currentSurvey.questions.length < 2) {
                setError('Anket soruları bulunamadı');
                setLoading(false);
                return;
            }

            await surveyService.submitResponse(surveyId, {
                answers: [
                    {
                        questionId: currentSurvey.questions[0]._id, // Assuming the first question is for rating
                        value: feedback.rating
                    },
                    {
                        questionId: currentSurvey.questions[1]._id, // Assuming the second question is for comment
                        value: feedback.comment
                    }
                ]
            });
            setSuccessMessage('Geri bildiriminiz için teşekkür ederiz!');
            setFeedback({ rating: 0, comment: '' });
            fetchSurveys(); // Yeni anketleri yükle
        } catch (error: any) {
            console.error('Error submitting feedback:', error);
            if (error.response) {
                setError(`Geri bildirim gönderilirken hata: ${error.response.status} - ${error.response.data.message || 'Bilinmeyen hata'}`);
            } else if (error.request) {
                setError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
            } else {
                setError(`Geri bildirim gönderilirken bir hata oluştu: ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleScanQrCode = async () => {
        if (!qrCodeInput.trim()) {
            showSnackbar('Lütfen QR kod ID veya kodu girin', 'error');
            return;
        }

        setScanLoading(true);
        setError('');

        try {
            let code = qrCodeInput.trim();

            // QR kod ID olarak mı yoksa kod olarak mı girdiğini kontrol et
            if (code.length === 24 && /^[0-9a-fA-F]{24}$/.test(code)) {
                // MongoDB ObjectId formatında (24 karakter hex) - QR kod ID'si olarak kabul et
                try {
                    // İlk önce QR kod ID'si olarak ara
                    const qrCodeResponse = await api.get(`/surveys/qr/${code}`);

                    if (qrCodeResponse.data && qrCodeResponse.data.code) {
                        // QR kod detayları alındı, code değerini al
                        code = qrCodeResponse.data.code;
                    }
                } catch (err) {
                    console.log('QR kod ID olarak bulunamadı, kod olarak denenecek', err);
                    // Hata aldık, belki bu direkt bir koddur, devam et
                }
            }

            // Doğrudan kodu kullanarak anket sayfasına yönlendir
            console.log(`Ankete yönlendiriliyor: /survey/code/${code}`);
            navigate(`/survey/code/${code}`);

        } catch (error: any) {
            console.error('QR kod tarama hatası:', error);
            setError('QR kod taranırken bir hata oluştu. Lütfen geçerli bir QR kod girin.');
        } finally {
            setScanLoading(false);
        }
    };

    console.log('Customer component render state', { loading, error, surveysCount: surveys.length });

    if (loading && tabValue === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Müşteri Portalı
            </Typography>

            <Paper sx={{ width: '100%', mb: 4 }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    centered
                >
                    <Tab label="Aktif Anketler" />
                    <Tab label="QR Kod Tara" icon={<QrCodeScannerIcon />} iconPosition="start" />
                </Tabs>

                <TabPanel value={tabValue} index={0}>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {successMessage && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            {successMessage}
                        </Alert>
                    )}

                    {surveys.length === 0 && !loading && !error ? (
                        <Paper sx={{ p: 3, mt: 2 }}>
                            <Typography variant="h6" align="center">
                                Şu anda aktif anket bulunmamaktadır.
                            </Typography>
                        </Paper>
                    ) : (
                        <Grid container spacing={3}>
                            {surveys.map((survey) => (
                                <Grid item xs={12} md={6} key={survey._id}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom>
                                                {survey.title}
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary" paragraph>
                                                {survey.description}
                                            </Typography>
                                            <Box sx={{ mb: 2 }}>
                                                <Typography component="legend">Değerlendirmeniz</Typography>
                                                <Rating
                                                    value={feedback.rating}
                                                    onChange={(event, newValue) => {
                                                        setFeedback({ ...feedback, rating: newValue || 0 });
                                                    }}
                                                />
                                            </Box>
                                            <TextField
                                                fullWidth
                                                multiline
                                                rows={4}
                                                variant="outlined"
                                                label="Yorumunuz"
                                                value={feedback.comment}
                                                onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
                                                sx={{ mb: 2 }}
                                            />
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={() => handleSubmitFeedback(survey._id)}
                                                disabled={loading || feedback.rating === 0}
                                            >
                                                Gönder
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    <Box sx={{ textAlign: 'center', maxWidth: 600, mx: 'auto', p: 3 }}>
                        <Typography variant="h5" gutterBottom>
                            QR Kod Tara
                        </Typography>
                        <Typography variant="body1" color="textSecondary" paragraph>
                            QR kod ID'sini veya kodunu girerek anket sayfasına ulaşabilirsiniz.
                        </Typography>

                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}

                        <TextField
                            fullWidth
                            label="QR Kod ID veya Kodu"
                            variant="outlined"
                            value={qrCodeInput}
                            onChange={(e) => setQrCodeInput(e.target.value)}
                            placeholder="Örn: S1a2b-muhtesem-x7y9"
                            sx={{ mb: 3, mt: 2 }}
                        />

                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            startIcon={<QrCodeScannerIcon />}
                            onClick={handleScanQrCode}
                            disabled={scanLoading || !qrCodeInput.trim()}
                            sx={{ minWidth: 200 }}
                        >
                            {scanLoading ? <CircularProgress size={24} /> : 'Ankete Git'}
                        </Button>
                    </Box>
                </TabPanel>
            </Paper>
        </Container>
    );
};

export default Customer; 