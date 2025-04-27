import React, { useState } from 'react';
import {
    Button,
    Box,
    Typography,
    Paper,
    Stack,
    TextField,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    Slider,
    Rating,
    Checkbox,
    CircularProgress,
    Alert,
    AlertTitle,
    InputAdornment,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// Tip tanımlamaları
interface QrCodeSearchModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: SurveyData) => void;
}

interface SurveyData {
    _id: string;
    title: string;
    description?: string;
    questions: QuestionData[];
    [key: string]: any; // diğer olası alanlar için
}

interface QuestionData {
    _id: string;
    type: 'radio' | 'scale' | 'rating' | 'text' | 'checkbox' | string;
    text: string;
    required: boolean;
    options?: string[];
    [key: string]: any; // diğer olası alanlar için
}

interface AnswerFormData {
    questionId: string;
    value: string | number | boolean;
}

interface PublicSurveyFormProps {
    survey: SurveyData;
    onSubmit: (answers: AnswerFormData[]) => void;
    isSubmitting: boolean;
}

// QR Kod ile anket arama modalı
const QrCodeSearchModal: React.FC<QrCodeSearchModalProps> = ({ open, onClose, onSubmit }) => {
    const [qrCode, setQrCode] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    const handleSubmit = async (): Promise<void> => {
        if (!qrCode.trim()) {
            setError('Lütfen bir QR kod ID girin');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.get(`/api/surveys/code/${qrCode.trim()}`);
            onSubmit(response.data);
            onClose();
        } catch (err) {
            console.error('QR kod arama hatası:', err);
            setError('QR kod bulunamadı veya geçersiz');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>QR Kod ile Anket Ara</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <Typography variant="body2">
                        QR kodu tarayamadıysanız, anket QR kodunun altında bulunan ID'yi manuel olarak girebilirsiniz.
                    </Typography>
                    <TextField
                        label="QR Kod ID"
                        fullWidth
                        value={qrCode}
                        onChange={(e) => setQrCode(e.target.value)}
                        placeholder="Örn: S123-1ab"
                        disabled={loading}
                        helperText="QR kod üzerindeki ID'yi giriniz"
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        edge="end"
                                        disabled={loading}
                                        onClick={handleSubmit}
                                    >
                                        {loading ? <CircularProgress size={24} /> : <SearchIcon />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>İptal</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    color="primary"
                    disabled={loading}
                >
                    {loading ? <CircularProgress size={24} /> : 'Ara'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

const PublicSurveyForm: React.FC<PublicSurveyFormProps> = ({ survey, onSubmit, isSubmitting }) => {
    const [answers, setAnswers] = useState<Record<string, string | number | boolean>>({});
    const [qrCodeModalOpen, setQrCodeModalOpen] = useState<boolean>(false);
    const navigate = useNavigate();

    // QR Kod ile bulunan anketi işle
    const handleQrCodeSurveyFound = (surveyData: SurveyData): void => {
        // Yeni anket sayfasına yönlendir
        navigate(`/survey/${surveyData._id}`);
    };

    const handleChange = (questionId: string, value: string | number | boolean): void => {
        setAnswers({
            ...answers,
            [questionId]: value
        });
    };

    const handleSubmitForm = (e: React.FormEvent): void => {
        e.preventDefault();

        const formattedAnswers: AnswerFormData[] = Object.keys(answers).map(questionId => ({
            questionId,
            value: answers[questionId]
        }));

        onSubmit(formattedAnswers);
    };

    if (!survey) return null;

    const renderQuestionInput = (question: QuestionData) => {
        const { _id, type, options, text, required } = question;

        switch (type) {
            case 'radio':
                return (
                    <FormControl fullWidth component="fieldset" required={required}>
                        <FormLabel component="legend">{text}</FormLabel>
                        <RadioGroup
                            name={_id}
                            value={answers[_id] || ''}
                            onChange={(e) => handleChange(_id, e.target.value)}
                        >
                            {options?.map((option: string, idx: number) => (
                                <FormControlLabel
                                    key={idx}
                                    value={option}
                                    control={<Radio />}
                                    label={option}
                                />
                            ))}
                        </RadioGroup>
                    </FormControl>
                );

            case 'scale':
                return (
                    <FormControl fullWidth component="fieldset" required={required}>
                        <FormLabel component="legend">{text}</FormLabel>
                        <Box sx={{ px: 2, py: 1 }}>
                            <Slider
                                value={Number(answers[_id] || 5)}
                                min={1}
                                max={10}
                                step={1}
                                valueLabelDisplay="on"
                                marks
                                onChange={(_, value) => handleChange(_id, value as number)}
                            />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                <Typography variant="caption">1 (En Düşük)</Typography>
                                <Typography variant="caption">10 (En Yüksek)</Typography>
                            </Box>
                        </Box>
                    </FormControl>
                );

            case 'rating':
                return (
                    <FormControl fullWidth component="fieldset" required={required}>
                        <FormLabel component="legend">{text}</FormLabel>
                        <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center' }}>
                            <Rating
                                name={_id}
                                value={Number(answers[_id] || 0)}
                                onChange={(_, value) => handleChange(_id, value || 0)}
                                precision={0.5}
                                size="large"
                            />
                            <Typography variant="body2" sx={{ ml: 2 }}>
                                {answers[_id] ? `${answers[_id]} / 5` : 'Değerlendirilmedi'}
                            </Typography>
                        </Box>
                    </FormControl>
                );

            case 'text':
                return (
                    <TextField
                        fullWidth
                        label={text}
                        multiline
                        rows={3}
                        value={String(answers[_id] || '')}
                        onChange={(e) => handleChange(_id, e.target.value)}
                        required={required}
                        margin="normal"
                    />
                );

            case 'checkbox':
                return (
                    <FormControl fullWidth component="fieldset" required={required} margin="normal">
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={Boolean(answers[_id])}
                                    onChange={(e) => handleChange(_id, e.target.checked)}
                                    name={_id}
                                />
                            }
                            label={text}
                        />
                    </FormControl>
                );

            default:
                return (
                    <Typography color="error">
                        Desteklenmeyen soru tipi: {type}
                    </Typography>
                );
        }
    };

    return (
        <>
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                <Stack spacing={3}>
                    <Box>
                        <Typography variant="h4" component="h1" gutterBottom>
                            {survey.title}
                        </Typography>
                        {survey.description && (
                            <Typography variant="body1" color="text.secondary" paragraph>
                                {survey.description}
                            </Typography>
                        )}
                    </Box>

                    <Box textAlign="center">
                        <Button
                            variant="outlined"
                            onClick={() => setQrCodeModalOpen(true)}
                            sx={{ mb: 2 }}
                        >
                            QR Kod ID ile Anket Ara
                        </Button>
                    </Box>

                    <form onSubmit={handleSubmitForm}>
                        <Stack spacing={4}>
                            {survey.questions?.map((question: QuestionData, index: number) => (
                                <Box key={question._id || index}>
                                    {renderQuestionInput(question)}
                                </Box>
                            ))}

                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    size="large"
                                    disabled={isSubmitting}
                                    sx={{ minWidth: 200 }}
                                >
                                    {isSubmitting ? (
                                        <CircularProgress size={24} color="inherit" />
                                    ) : (
                                        'Gönder'
                                    )}
                                </Button>
                            </Box>
                        </Stack>
                    </form>
                </Stack>
            </Paper>

            <QrCodeSearchModal
                open={qrCodeModalOpen}
                onClose={() => setQrCodeModalOpen(false)}
                onSubmit={handleQrCodeSurveyFound}
            />
        </>
    );
};

export default PublicSurveyForm; 