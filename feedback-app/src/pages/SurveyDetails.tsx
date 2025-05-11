import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Typography,
    Box,
    Button,
    CircularProgress,
    Alert,
    IconButton,
    Paper,
    Grid,
    Divider,
    Chip,
    Card,
    CardContent,
    List,
    ListItem,
    ListItemText,
    ListItemIcon
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Edit as EditIcon,
    QrCode as QrCodeIcon,
    DateRange as DateRangeIcon,
    QuestionAnswer as QuestionAnswerIcon,
    RadioButtonChecked as RadioIcon,
    TextFields as TextFieldsIcon,
    Star as StarIcon,
    LinearScale as ScaleIcon,
    BarChart as BarChartIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
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
    isActive: boolean;
    startDate?: string;
    endDate?: string;
    business: string;
    createdAt: string;
    createdBy: any;
    responseCount?: number;
}

const SurveyDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [survey, setSurvey] = useState<Survey | null>(null);

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

    const getQuestionTypeIcon = (type: string) => {
        switch (type) {
            case 'text':
                return <TextFieldsIcon />;
            case 'radio':
                return <RadioIcon />;
            case 'rating':
                return <StarIcon />;
            case 'scale':
                return <ScaleIcon />;
            default:
                return <QuestionAnswerIcon />;
        }
    };

    const getQuestionTypeText = (type: string) => {
        switch (type) {
            case 'text':
                return 'Metin';
            case 'radio':
                return 'Çoktan Seçmeli';
            case 'rating':
                return 'Derecelendirme';
            case 'scale':
                return 'Ölçek (1-10)';
            default:
                return type;
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Belirtilmemiş';

        try {
            return format(new Date(dateString), 'dd MMMM yyyy', { locale: tr });
        } catch (error) {
            return 'Geçersiz Tarih';
        }
    };

    if (loading) {
        return (
            <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ mt: 2 }}>Anket yükleniyor...</Typography>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="md" sx={{ mt: 4 }}>
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/business/surveys')}
                >
                    Anketlere Dön
                </Button>
            </Container>
        );
    }

    if (!survey) {
        return (
            <Container maxWidth="md" sx={{ mt: 4 }}>
                <Alert severity="warning" sx={{ mb: 3 }}>
                    Anket bulunamadı
                </Alert>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/business/surveys')}
                >
                    Anketlere Dön
                </Button>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ my: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                <IconButton onClick={() => navigate('/business/surveys')} sx={{ mr: 2 }}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4" component="h1" sx={{ flexGrow: 1 }}>
                    Anket Detayları
                </Typography>
                <Box>
                    <IconButton
                        color="primary"
                        onClick={() => navigate(`/business/surveys/${survey._id}/edit`)}
                        title="Anketi Düzenle"
                        sx={{ mr: 1 }}
                    >
                        <EditIcon />
                    </IconButton>
                    <IconButton
                        color="primary"
                        onClick={() => navigate(`/business/surveys/${survey._id}/qr-codes`)}
                        title="QR Kodlarını Görüntüle"
                    >
                        <QrCodeIcon />
                    </IconButton>
                </Box>
            </Box>

            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Typography variant="h5" gutterBottom>{survey.title}</Typography>
                        <Chip
                            label={survey.isActive ? 'Aktif' : 'Pasif'}
                            color={survey.isActive ? 'success' : 'error'}
                            size="small"
                            sx={{ mr: 1 }}
                        />
                        {survey.responseCount !== undefined && (
                            <Chip
                                label={`${survey.responseCount} Yanıt`}
                                color="primary"
                                size="small"
                            />
                        )}
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="body1" color="text.secondary" paragraph>
                            {survey.description || 'Bu anket için açıklama bulunmamaktadır.'}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <DateRangeIcon color="action" sx={{ mr: 1 }} />
                            <Typography variant="body2">
                                <strong>Başlangıç:</strong> {formatDate(survey.startDate)}
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <DateRangeIcon color="action" sx={{ mr: 1 }} />
                            <Typography variant="body2">
                                <strong>Bitiş:</strong> {formatDate(survey.endDate)}
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <DateRangeIcon color="action" sx={{ mr: 1 }} />
                            <Typography variant="body2">
                                <strong>Oluşturulma Tarihi:</strong> {formatDate(survey.createdAt)}
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
                Sorular ({survey.questions.length})
            </Typography>

            {survey.questions.length === 0 ? (
                <Alert severity="info" sx={{ mb: 3 }}>
                    Bu ankette henüz soru bulunmamaktadır.
                </Alert>
            ) : (
                <List>
                    {survey.questions.map((question, index) => (
                        <Card key={question._id || index} sx={{ mb: 2 }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', mb: 2 }}>
                                    <ListItemIcon>
                                        {getQuestionTypeIcon(question.type)}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Typography variant="h6">
                                                {index + 1}. {question.text}
                                            </Typography>
                                        }
                                        secondary={
                                            <>
                                                <Typography variant="body2" color="text.secondary">
                                                    Tür: {getQuestionTypeText(question.type)}
                                                    {question.required && ' • Zorunlu'}
                                                </Typography>
                                            </>
                                        }
                                    />
                                </Box>

                                {(question.type === 'radio' || question.type === 'multiple_choice') && question.options && question.options.length > 0 && (
                                    <Box sx={{ pl: 6 }}>
                                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Seçenekler:</Typography>
                                        <List dense disablePadding>
                                            {question.options.map((option, optionIndex) => (
                                                <ListItem key={optionIndex} disablePadding sx={{ py: 0.5 }}>
                                                    <ListItemIcon sx={{ minWidth: 28 }}>
                                                        <RadioIcon fontSize="small" />
                                                    </ListItemIcon>
                                                    <ListItemText primary={option} />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </List>
            )}

            <Divider sx={{ my: 4 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/business/surveys')}
                >
                    Anketlere Dön
                </Button>
                <Box sx={{ mt: 3, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => navigate(`/business/surveys/${id}/edit`)}
                        startIcon={<EditIcon />}
                    >
                        Anketi Düzenle
                    </Button>
                    <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => navigate(`/business/surveys/${id}/qr-codes`)}
                        startIcon={<QrCodeIcon />}
                    >
                        QR Kodları
                    </Button>
                    <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => navigate(`/survey/${id}/responses`)}
                        startIcon={<BarChartIcon />}
                    >
                        Yanıtları Görüntüle
                    </Button>
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={handleDeleteSurvey}
                        startIcon={<DeleteIcon />}
                    >
                        Anketi Sil
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default SurveyDetails; 