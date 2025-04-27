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
    CardContent
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { surveyService } from '../services/surveyService';
import { Survey } from '../types/Survey';

const Customer = () => {
    const { user } = useAuth();
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [feedback, setFeedback] = useState({
        rating: 0,
        comment: ''
    });
    const [successMessage, setSuccessMessage] = useState<string>('');

    console.log('Customer component rendered', { user });

    useEffect(() => {
        console.log('Customer component mounted');
        fetchSurveys();
    }, []);

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

    console.log('Customer component render state', { loading, error, surveysCount: surveys.length });

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Müşteri Geri Bildirimi
            </Typography>

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
        </Container>
    );
};

export default Customer; 