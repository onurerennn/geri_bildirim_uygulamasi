import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Typography,
    Box,
    TextField,
    Button,
    CircularProgress,
    Alert,
    IconButton,
    Paper,
    Divider,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Switch,
    Card,
    CardContent,
    CardActions
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
    Delete as DeleteIcon,
    Add as AddIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface Question {
    _id?: string;
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
}

const EditSurvey: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [survey, setSurvey] = useState<Survey | null>(null);

    // Yeni form alanları için state'ler
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isActive, setIsActive] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

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
                const surveyData = response.data;

                setSurvey(surveyData);

                // Form alanlarını doldur
                setTitle(surveyData.title || '');
                setDescription(surveyData.description || '');
                setQuestions(surveyData.questions || []);
                setIsActive(surveyData.isActive !== undefined ? surveyData.isActive : true);

                // Tarihleri yerel formata çevir
                if (surveyData.startDate) {
                    setStartDate(new Date(surveyData.startDate).toISOString().split('T')[0]);
                }
                if (surveyData.endDate) {
                    setEndDate(new Date(surveyData.endDate).toISOString().split('T')[0]);
                }

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

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);

            const updatedSurvey = {
                title,
                description,
                questions,
                isActive,
                startDate: startDate || undefined,
                endDate: endDate || undefined
            };

            await api.put(`/api/surveys/${id}`, updatedSurvey);

            setSaving(false);
            navigate('/business/surveys');
        } catch (err: any) {
            console.error('Anket güncellenirken hata oluştu:', err);

            let errorMessage = 'Anket güncellenirken bir hata oluştu';
            if (err.response?.data?.error) {
                errorMessage = err.response.data.error;
            }

            setError(errorMessage);
            setSaving(false);
        }
    };

    const handleDeleteQuestion = (index: number) => {
        const newQuestions = [...questions];
        newQuestions.splice(index, 1);
        setQuestions(newQuestions);
    };

    const handleAddQuestion = () => {
        const newQuestion: Question = {
            text: '',
            type: 'text',
            required: true
        };
        setQuestions([...questions, newQuestion]);
    };

    const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
        const newQuestions = [...questions];
        newQuestions[index] = { ...newQuestions[index], [field]: value };

        // Eğer soru tipi değiştiyse ve yeni tip 'radio' veya 'checkbox' ise options ekle
        if (field === 'type' && (value === 'radio' || value === 'multiple_choice') && !newQuestions[index].options) {
            newQuestions[index].options = ['', ''];
        }

        setQuestions(newQuestions);
    };

    const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
        const newQuestions = [...questions];
        if (!newQuestions[questionIndex].options) {
            newQuestions[questionIndex].options = [];
        }
        newQuestions[questionIndex].options![optionIndex] = value;
        setQuestions(newQuestions);
    };

    const handleAddOption = (questionIndex: number) => {
        const newQuestions = [...questions];
        if (!newQuestions[questionIndex].options) {
            newQuestions[questionIndex].options = [];
        }
        newQuestions[questionIndex].options!.push('');
        setQuestions(newQuestions);
    };

    const handleDeleteOption = (questionIndex: number, optionIndex: number) => {
        const newQuestions = [...questions];
        newQuestions[questionIndex].options!.splice(optionIndex, 1);
        setQuestions(newQuestions);
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

    return (
        <Container maxWidth="md" sx={{ my: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                <IconButton onClick={() => navigate('/business/surveys')} sx={{ mr: 2 }}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4" component="h1">
                    Anket Düzenle
                </Typography>
            </Box>

            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                <Box component="form" noValidate autoComplete="off">
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <TextField
                                label="Anket Başlığı"
                                fullWidth
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Açıklama"
                                fullWidth
                                multiline
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Başlangıç Tarihi"
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Bitiş Tarihi"
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={isActive}
                                        onChange={(e) => setIsActive(e.target.checked)}
                                    />
                                }
                                label="Anket Aktif"
                            />
                        </Grid>
                    </Grid>
                </Box>
            </Paper>

            <Typography variant="h5" component="h2" gutterBottom>
                Sorular
            </Typography>

            {questions.map((question, index) => (
                <Card key={index} sx={{ mb: 3 }}>
                    <CardContent>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    label="Soru Metni"
                                    fullWidth
                                    required
                                    value={question.text}
                                    onChange={(e) => handleQuestionChange(index, 'text', e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Soru Tipi</InputLabel>
                                    <Select
                                        value={question.type}
                                        label="Soru Tipi"
                                        onChange={(e) => handleQuestionChange(index, 'type', e.target.value)}
                                    >
                                        <MenuItem value="text">Metin</MenuItem>
                                        <MenuItem value="radio">Çoktan Seçmeli</MenuItem>
                                        <MenuItem value="rating">Derecelendirme</MenuItem>
                                        <MenuItem value="scale">Ölçek (1-10)</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={question.required}
                                            onChange={(e) => handleQuestionChange(index, 'required', e.target.checked)}
                                        />
                                    }
                                    label="Zorunlu"
                                />
                            </Grid>

                            {/* Seçenek alanları */}
                            {(question.type === 'radio' || question.type === 'multiple_choice') && (
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Seçenekler
                                    </Typography>
                                    <Box sx={{ pl: 2 }}>
                                        {question.options?.map((option, optionIndex) => (
                                            <Box key={optionIndex} sx={{ display: 'flex', mb: 1 }}>
                                                <TextField
                                                    label={`Seçenek ${optionIndex + 1}`}
                                                    fullWidth
                                                    value={option}
                                                    onChange={(e) => handleOptionChange(index, optionIndex, e.target.value)}
                                                    sx={{ mr: 1 }}
                                                />
                                                <IconButton
                                                    color="error"
                                                    onClick={() => handleDeleteOption(index, optionIndex)}
                                                    disabled={question.options!.length <= 2}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Box>
                                        ))}
                                        <Button
                                            startIcon={<AddIcon />}
                                            onClick={() => handleAddOption(index)}
                                            sx={{ mt: 1 }}
                                        >
                                            Seçenek Ekle
                                        </Button>
                                    </Box>
                                </Grid>
                            )}
                        </Grid>
                    </CardContent>
                    <CardActions>
                        <Button
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleDeleteQuestion(index)}
                        >
                            Soruyu Sil
                        </Button>
                    </CardActions>
                </Card>
            ))}

            <Box sx={{ mt: 2, mb: 4, display: 'flex', justifyContent: 'center' }}>
                <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleAddQuestion}
                >
                    Yeni Soru Ekle
                </Button>
            </Box>

            <Divider sx={{ mb: 4 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/business/surveys')}
                >
                    İptal
                </Button>
                <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={saving || !title || !questions.length}
                >
                    {saving ? 'Kaydediliyor...' : 'Anketi Kaydet'}
                </Button>
            </Box>
        </Container>
    );
};

export default EditSurvey; 