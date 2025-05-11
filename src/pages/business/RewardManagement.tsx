import React, { useState, useEffect } from 'react';
import { rewardService } from '../../services/rewardService';
import { Box, Button, TextField, Typography, Card, CardContent, Grid, Alert } from '@mui/material';

interface SurveyPoints {
    surveyId: string;
    points: number;
}

const RewardManagement: React.FC = () => {
    const [surveys, setSurveys] = useState<any[]>([]);
    const [surveyPoints, setSurveyPoints] = useState<SurveyPoints[]>([]);
    const [selectedSurvey, setSelectedSurvey] = useState('');
    const [points, setPoints] = useState<number>(0);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        // Anketleri yükle
        loadSurveys();
    }, []);

    const loadSurveys = async () => {
        try {
            // TODO: Anket servisinden anketleri çek
            // const response = await surveyService.getBusinessSurveys();
            // setSurveys(response.data);
        } catch (error) {
            setMessage({ type: 'error', text: 'Anketler yüklenirken bir hata oluştu.' });
        }
    };

    const handlePointsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await rewardService.setSurveyPoints(selectedSurvey, points);
            setMessage({ type: 'success', text: 'Puan başarıyla tanımlandı.' });

            // Form temizleme
            setSelectedSurvey('');
            setPoints(0);
        } catch (error) {
            setMessage({ type: 'error', text: 'Puan tanımlanırken bir hata oluştu.' });
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Puan Yönetimi
            </Typography>

            {message.text && (
                <Alert severity={message.type as 'error' | 'success'} sx={{ mb: 2 }}>
                    {message.text}
                </Alert>
            )}

            <Card sx={{ mb: 4 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Anket Puanı Tanımla
                    </Typography>
                    <form onSubmit={handlePointsSubmit}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Anket Seçin"
                                    value={selectedSurvey}
                                    onChange={(e) => setSelectedSurvey(e.target.value)}
                                    SelectProps={{
                                        native: true,
                                    }}
                                >
                                    <option value="">Seçiniz</option>
                                    {surveys.map((survey) => (
                                        <option key={survey._id} value={survey._id}>
                                            {survey.title}
                                        </option>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Puan"
                                    value={points}
                                    onChange={(e) => setPoints(Number(e.target.value))}
                                    InputProps={{ inputProps: { min: 0 } }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    disabled={!selectedSurvey || points <= 0}
                                >
                                    Puan Tanımla
                                </Button>
                            </Grid>
                        </Grid>
                    </form>
                </CardContent>
            </Card>

            <Typography variant="h6" gutterBottom>
                Tanımlı Puanlar
            </Typography>
            <Grid container spacing={2}>
                {surveyPoints.map((sp) => (
                    <Grid item xs={12} sm={6} md={4} key={sp.surveyId}>
                        <Card>
                            <CardContent>
                                <Typography variant="subtitle1">
                                    {surveys.find(s => s._id === sp.surveyId)?.title}
                                </Typography>
                                <Typography variant="h6" color="primary">
                                    {sp.points} Puan
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default RewardManagement; 