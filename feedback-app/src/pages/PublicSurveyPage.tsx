import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Box, CircularProgress, Typography, Alert, Button } from '@mui/material';
import PublicSurveyForm from '../components/PublicSurveyForm';
import api from '../services/api';

// Soru ve cevap tipleri tanımlayalım
interface Question {
    _id: string;
    text: string;
    required: boolean;
    type: string;
    options?: string[];
}

// PublicSurveyForm bileşeninde tanımlanan AnswerFormData tipine uyumlu olmalı
interface AnswerFormData {
    questionId: string;
    value: string | number | boolean;
}

interface SurveyData {
    _id: string;
    title: string;
    description: string;
    questions: Question[];
    isActive: boolean;
}

const PublicSurveyPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [survey, setSurvey] = useState<SurveyData | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        const fetchSurvey = async () => {
            try {
                setLoading(true);
                setError(null);

                if (!id) {
                    setError('Anket ID bulunamadı');
                    setLoading(false);
                    return;
                }

                const response = await api.get(`/api/surveys/${id}`);
                setSurvey(response.data);
                setLoading(false);
            } catch (err: any) {
                console.error('Anket yüklenirken hata oluştu:', err);

                let errorMessage = 'Anket yüklenirken bir hata oluştu';
                if (err.response?.status === 404) {
                    errorMessage = 'Anket bulunamadı';
                } else if (err.response?.data?.error) {
                    errorMessage = err.response.data.error;
                }

                setError(errorMessage);
                setLoading(false);
            }
        };

        fetchSurvey();
    }, [id]);

    const handleSubmit = async (formAnswers: AnswerFormData[]) => {
        try {
            setSubmitting(true);
            setError('');

            if (!survey) {
                setError('Anket bilgisi bulunamadı');
                setSubmitting(false);
                return;
            }

            // Verilen yanıtları kontrol et
            if (!formAnswers.length) {
                setError('Lütfen en az bir soruyu cevaplayın');
                setSubmitting(false);
                return;
            }

            // Tüm gerekli soruların cevaplandığından emin olalım
            const unansweredRequired = survey.questions
                .filter((q: Question) => q.required)
                .filter((q: Question) => !formAnswers.some(a => a.questionId === q._id));

            if (unansweredRequired.length > 0) {
                setError(`Lütfen tüm zorunlu soruları cevaplayın: ${unansweredRequired.map((q: Question) => q.text).join(', ')}`);
                setSubmitting(false);
                return;
            }

            const response = {
                surveyId: survey._id,
                answers: formAnswers
            };

            try {
                await api.post(`/api/surveys/${survey._id}/responses`, response);
                setSubmitted(true);
            } catch (error: any) {
                console.error('Yanıt gönderilirken hata oluştu:', error);

                // Duplicate hatasını daha kullanıcı dostu şekilde göster
                if (error.response?.data?.message?.includes('duplicate') ||
                    error.message?.includes('duplicate') ||
                    error.message?.includes('daha önce yanıt verdiniz')) {
                    setError('Bu ankete daha önce yanıt verdiniz. Teşekkür ederiz!');
                } else {
                    setError(`Yanıt gönderilirken hata oluştu: ${error.message || 'Bilinmeyen hata'}`);
                }
            }
        } catch (error: any) {
            console.error('Form gönderilirken beklenmeyen hata:', error);
            setError('Form gönderilirken beklenmeyen bir hata oluştu');
        } finally {
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
            {survey && <PublicSurveyForm
                survey={survey}
                onSubmit={handleSubmit}
                isSubmitting={submitting}
            />}
        </Container>
    );
};

export default PublicSurveyPage; 