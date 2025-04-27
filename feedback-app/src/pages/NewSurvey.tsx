import React, { useState } from 'react';
import {
    Container,
    Typography,
    TextField,
    Button,
    Box,
    Paper,
    IconButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
    Checkbox,
    FormControlLabel,
    Grid,
    Divider,
    Alert,
    CircularProgress,
    Card,
    CardContent
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import surveyService from '../services/surveyService';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const questionTypes = [
    { value: 'text', label: 'Metin' },
    { value: 'rating', label: 'Derecelendirme' },
    { value: 'multiple_choice', label: 'Çoktan Seçmeli' }
];

interface Question {
    text: string;
    type: 'text' | 'rating' | 'multiple_choice';
    options?: string[];
    required: boolean;
}

const NewSurvey: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
        questions: [
            {
                text: '',
                type: 'text' as 'text' | 'rating' | 'multiple_choice',
                options: [''],
                required: true
            }
        ]
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleQuestionChange = (index: number, field: keyof Question, value: any) => {
        const updatedQuestions = [...formData.questions];
        updatedQuestions[index] = {
            ...updatedQuestions[index],
            [field]: value
        };

        // If type changed to something that doesn't need options, remove options property
        if (field === 'type' && value !== 'multiple_choice') {
            // Instead of destructuring, create a new object with required properties
            // Include empty options array to satisfy the type
            updatedQuestions[index] = {
                text: updatedQuestions[index].text,
                type: updatedQuestions[index].type,
                required: updatedQuestions[index].required,
                options: [] // Keep an empty array to satisfy the type requirements
            };
        }

        // If changing to multiple_choice and no options exist, add one empty option
        if (field === 'type' && value === 'multiple_choice' &&
            (!updatedQuestions[index].options || updatedQuestions[index].options.length === 0)) {
            updatedQuestions[index].options = [''];
        }

        setFormData({
            ...formData,
            questions: updatedQuestions
        });
    };

    const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
        const updatedQuestions = [...formData.questions];
        if (updatedQuestions[questionIndex].options) {
            updatedQuestions[questionIndex].options![optionIndex] = value;
            setFormData({
                ...formData,
                questions: updatedQuestions
            });
        }
    };

    const addOption = (questionIndex: number) => {
        const updatedQuestions = [...formData.questions];
        if (updatedQuestions[questionIndex].options) {
            updatedQuestions[questionIndex].options!.push('');
            setFormData({
                ...formData,
                questions: updatedQuestions
            });
        }
    };

    const removeOption = (questionIndex: number, optionIndex: number) => {
        const updatedQuestions = [...formData.questions];
        if (updatedQuestions[questionIndex].options && updatedQuestions[questionIndex].options!.length > 1) {
            updatedQuestions[questionIndex].options!.splice(optionIndex, 1);
            setFormData({
                ...formData,
                questions: updatedQuestions
            });
        }
    };

    const addQuestion = () => {
        setFormData({
            ...formData,
            questions: [
                ...formData.questions,
                {
                    text: '',
                    type: 'text',
                    options: [''],
                    required: true
                }
            ]
        });
    };

    const removeQuestion = (index: number) => {
        if (formData.questions.length > 1) {
            const updatedQuestions = [...formData.questions];
            updatedQuestions.splice(index, 1);
            setFormData({
                ...formData,
                questions: updatedQuestions
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        console.log('📝 Form gönderiliyor...');

        try {
            // Form doğrulama
            if (!formData.title.trim()) {
                throw new Error('Anket başlığı gereklidir');
            }

            if (!formData.description.trim()) {
                throw new Error('Anket açıklaması gereklidir');
            }

            if (formData.questions.length === 0) {
                throw new Error('En az bir soru eklemelisiniz');
            }

            // Soruları doğrula
            formData.questions.forEach((question, index) => {
                if (!question.text.trim()) {
                    throw new Error(`Soru ${index + 1} metni gereklidir`);
                }

                if (question.type === 'multiple_choice' && question.options) {
                    if (question.options.some(option => !option.trim())) {
                        throw new Error(`Soru ${index + 1} için tüm seçenekler doldurulmalıdır`);
                    }
                }
            });

            console.log('✅ Form doğrulandı, göndermeye hazırlanıyor...');

            // Tarihleri hazırla
            const startDateObj = new Date(formData.startDate);
            const endDateObj = new Date(formData.endDate);

            // Tarih doğrulama
            if (isNaN(startDateObj.getTime())) {
                throw new Error('Başlangıç tarihi geçerli değil');
            }

            if (isNaN(endDateObj.getTime())) {
                throw new Error('Bitiş tarihi geçerli değil');
            }

            // İşletme kontrolü
            if (!user?.business) {
                console.error('❌ Kullanıcının işletme ID\'si bulunamadı');
                throw new Error('İşletme bilgisi bulunamadı. Lütfen profil bilgilerinizi güncelleyin.');
            }

            console.log('✅ İşletme ID:', user.business);

            // API verisi hazırlama
            const surveyData = {
                ...formData,
                startDate: startDateObj,
                endDate: endDateObj,
                business: user.business,
                questions: formData.questions.map(q => {
                    const result: Question = {
                        text: q.text,
                        type: q.type,
                        required: q.required
                    };

                    if (q.type === 'multiple_choice' && q.options) {
                        result.options = q.options;
                    }

                    return result;
                })
            };

            // Anket oluşturma isteği gönder
            console.log('📤 API isteği gönderiliyor...');

            try {
                // surveyService tüm alternatif endpointleri deneyecek
                const response = await surveyService.createSurvey(surveyData);
                console.log('✅ Anket başarıyla oluşturuldu:', response);

                // Başarılı mesaj göster
                setError(null);
                alert('Anket başarıyla oluşturuldu! Anketler sayfasına yönlendiriliyorsunuz.');

                // Kısa gecikme sonrası yönlendirme
                setTimeout(() => {
                    navigate('/business/surveys');
                }, 1000);
            } catch (apiError: any) {
                console.error('❌ API hatası:', apiError);

                // Hata detayları
                if (apiError.response) {
                    const status = apiError.response.status;
                    const errorMsg = apiError.response.data?.error ||
                        apiError.response.data?.message ||
                        'Bilinmeyen hata';

                    // HTTP durum koduna göre özel mesajlar
                    if (status === 404) {
                        setError(`Sunucu hatası: Endpoint bulunamadı (404). Lütfen daha sonra tekrar deneyin.`);
                    } else if (status === 401) {
                        setError(`Yetkilendirme hatası: Lütfen tekrar giriş yapın.`);
                    } else if (status === 403) {
                        setError(`Yetki hatası: Bu işlemi gerçekleştirme yetkiniz yok.`);
                    } else if (status === 400) {
                        setError(`Geçersiz istek: ${errorMsg}`);
                    } else {
                        setError(`Sunucu hatası (${status}): ${errorMsg}`);
                    }
                } else if (apiError.request) {
                    setError('Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.');
                } else {
                    setError(apiError.message || 'Anket oluşturulurken beklenmeyen bir hata oluştu.');
                }

                // Hatayı konsola tam olarak logla
                console.error('Tam hata detayı:', apiError);
            }
        } catch (err: any) {
            // Genel form hataları
            console.error('❌ Form hatası:', err);
            setError(err.message || 'Anket oluşturulurken beklenmeyen bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ my: 4 }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
                <IconButton onClick={() => navigate('/business/surveys')} sx={{ mr: 2 }}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4">Yeni Anket Oluştur</Typography>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Paper sx={{ p: 3 }}>
                <form onSubmit={handleSubmit}>
                    <Box sx={{ mb: 3 }}>
                        <TextField
                            label="Anket Başlığı"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            fullWidth
                            required
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            label="Anket Açıklaması"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            fullWidth
                            required
                            multiline
                            rows={2}
                        />
                    </Box>

                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Başlangıç Tarihi"
                                name="startDate"
                                type="date"
                                value={formData.startDate}
                                onChange={handleChange}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Bitiş Tarihi"
                                name="endDate"
                                type="date"
                                value={formData.endDate}
                                onChange={handleChange}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>

                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Sorular
                    </Typography>

                    {formData.questions.map((question, questionIndex) => (
                        <Card key={questionIndex} sx={{ mb: 3, position: 'relative' }}>
                            <CardContent>
                                <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                                    <IconButton
                                        color="error"
                                        onClick={() => removeQuestion(questionIndex)}
                                        disabled={formData.questions.length <= 1}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </Box>

                                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                                    Soru {questionIndex + 1}
                                </Typography>

                                <TextField
                                    label="Soru Metni"
                                    value={question.text}
                                    onChange={(e) => handleQuestionChange(questionIndex, 'text', e.target.value)}
                                    fullWidth
                                    required
                                    sx={{ mb: 2 }}
                                />

                                <Grid container spacing={2} sx={{ mb: 2 }}>
                                    <Grid item xs={12} sm={6}>
                                        <FormControl fullWidth>
                                            <InputLabel>Soru Tipi</InputLabel>
                                            <Select
                                                value={question.type}
                                                label="Soru Tipi"
                                                onChange={(e) => handleQuestionChange(questionIndex, 'type', e.target.value)}
                                            >
                                                {questionTypes.map((type) => (
                                                    <MenuItem key={type.value} value={type.value}>
                                                        {type.label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={question.required}
                                                    onChange={(e) => handleQuestionChange(questionIndex, 'required', e.target.checked)}
                                                />
                                            }
                                            label="Zorunlu Soru"
                                        />
                                    </Grid>
                                </Grid>

                                {question.type === 'multiple_choice' && question.options && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                            Seçenekler
                                        </Typography>

                                        {question.options.map((option, optionIndex) => (
                                            <Box key={optionIndex} sx={{ display: 'flex', mb: 1 }}>
                                                <TextField
                                                    label={`Seçenek ${optionIndex + 1}`}
                                                    value={option}
                                                    onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)}
                                                    fullWidth
                                                    size="small"
                                                    required
                                                />
                                                <IconButton
                                                    color="error"
                                                    onClick={() => removeOption(questionIndex, optionIndex)}
                                                    disabled={question.options!.length <= 1}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Box>
                                        ))}

                                        <Button
                                            startIcon={<AddIcon />}
                                            onClick={() => addOption(questionIndex)}
                                            sx={{ mt: 1 }}
                                        >
                                            Seçenek Ekle
                                        </Button>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    ))}

                    <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={addQuestion}
                        sx={{ mb: 3 }}
                    >
                        Soru Ekle
                    </Button>

                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={() => navigate('/business/surveys')}
                            sx={{ mr: 2 }}
                        >
                            İptal
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={loading}
                            startIcon={loading && <CircularProgress size={20} color="inherit" />}
                        >
                            {loading ? 'Kaydediliyor...' : 'Anketi Kaydet'}
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Container>
    );
};

export default NewSurvey; 