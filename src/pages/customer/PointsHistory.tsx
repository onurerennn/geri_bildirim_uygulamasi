import React, { useState, useEffect } from 'react';
import { rewardService } from '../../services/rewardService';
import { Box, Typography, Card, CardContent, Grid, Divider } from '@mui/material';

interface PointHistory {
    _id: string;
    businessId: string;
    businessName: string;
    points: number;
    type: 'earned' | 'spent';
    description: string;
    createdAt: string;
}

const PointsHistory: React.FC = () => {
    const [pointsHistory, setPointsHistory] = useState<PointHistory[]>([]);
    const [totalPoints, setTotalPoints] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        loadPointsHistory();
    }, []);

    const loadPointsHistory = async () => {
        try {
            const history = await rewardService.getPointsHistory();
            setPointsHistory(history);

            // İşletmelere göre toplam puanları hesapla
            const pointsByBusiness = history.reduce((acc: { [key: string]: number }, curr) => {
                if (!acc[curr.businessId]) {
                    acc[curr.businessId] = 0;
                }
                acc[curr.businessId] += curr.type === 'earned' ? curr.points : -curr.points;
                return acc;
            }, {});

            setTotalPoints(pointsByBusiness);
        } catch (error) {
            console.error('Puan geçmişi yüklenirken hata:', error);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Puan Geçmişim
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Card sx={{ mb: 4 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Toplam Puanlarım
                            </Typography>
                            <Grid container spacing={2}>
                                {Object.entries(totalPoints).map(([businessId, points]) => (
                                    <Grid item xs={12} sm={6} md={4} key={businessId}>
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography variant="subtitle1">
                                                    {pointsHistory.find(h => h.businessId === businessId)?.businessName}
                                                </Typography>
                                                <Typography variant="h5" color="primary">
                                                    {points} Puan
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                        Puan Hareketleri
                    </Typography>
                    {pointsHistory.map((history) => (
                        <Card key={history._id} sx={{ mb: 2 }}>
                            <CardContent>
                                <Grid container justifyContent="space-between" alignItems="center">
                                    <Grid item>
                                        <Typography variant="subtitle1">
                                            {history.businessName}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            {history.description}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {new Date(history.createdAt).toLocaleDateString()}
                                        </Typography>
                                    </Grid>
                                    <Grid item>
                                        <Typography
                                            variant="h6"
                                            color={history.type === 'earned' ? 'success.main' : 'error.main'}
                                        >
                                            {history.type === 'earned' ? '+' : '-'}{history.points} Puan
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    ))}
                </Grid>
            </Grid>
        </Box>
    );
};

export default PointsHistory; 