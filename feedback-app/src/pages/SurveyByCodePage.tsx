import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Box, CircularProgress, Typography, Alert, Button } from '@mui/material';
import PublicSurveyForm from '../components/PublicSurveyForm';
import api from '../services/api';

const SurveyByCodePage: React.FC = () => {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [survey, setSurvey] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        const fetchSurvey = async () => {
            try {
                setLoading(true);
                setError(null);

                if (!code) {
                    setError('QR kod bulunamadı');
                    setLoading(false);
                    return;
                }

                const response = await api.get(`/surveys/code/${code}`);
                setSurvey(response.data);
                setLoading(false);
            } catch (err: any) {
                console.error('Anket yüklenirken hata oluştu:', err);

                let errorMessage = 'Anket yüklenirken bir hata oluştu';
                if (err.response?.status === 404) {
                    errorMessage = 'Bu QR kod için anket bulunamadı';
                } else if (err.response?.data?.error) {
                    errorMessage = err.response.data.error;
                }

                setError(errorMessage);
                setLoading(false);
            }
        };

        fetchSurvey();
    }, [code]);

    const handleSubmit = async (answers: any[]) => {
        try {
            setSubmitting(true);

            if (!answers.length) {
                alert('Lütfen en az bir soruyu cevaplayın');
                setSubmitting(false);
                return;
            }

            await api.post(`/surveys/${survey._id}/responses`, {
                surveyId: survey._id,
                answers
            });

            setSubmitted(true);
            setSubmitting(false);
        } catch (err: any) {
            console.error('Anket gönderilirken hata oluştu:', err);
            alert('Anket gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ mt: 2 }}>
                    Anket yükleniyor...
                </Typography>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="md" sx={{ mt: 8 }}>
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
                <Box textAlign="center">
                    <Button
                        variant="contained"
                        onClick={() => navigate('/')}
                    >
                        Ana Sayfaya Dön
                    </Button>
                </Box>
            </Container>
        );
    }

    if (submitted) {
        return (
            <Container maxWidth="md" sx={{ mt: 8 }}>
                <Alert severity="success" sx={{ mb: 3 }}>
                    Anket yanıtınız başarıyla gönderildi! Katılımınız için teşekkür ederiz.
                </Alert>
                <Box textAlign="center">
                    <Button
                        variant="contained"
                        onClick={() => navigate('/')}
                    >
                        Ana Sayfaya Dön
                    </Button>
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ mt: 8, mb: 8 }}>
            <PublicSurveyForm
                survey={survey}
                onSubmit={handleSubmit}
                isSubmitting={submitting}
            />
        </Container>
    );
};

export default SurveyByCodePage; 