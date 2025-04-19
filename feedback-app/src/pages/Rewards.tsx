import React from 'react';
import {
    Container,
    Card,
    CardContent,
    CardActions,
    Typography,
    Button,
    Box,
    LinearProgress,
} from '@mui/material';
import { EmojiEvents as TrophyIcon } from '@mui/icons-material';

const Rewards: React.FC = () => {
    // Örnek ödül verileri
    const rewards = [
        {
            id: 1,
            title: '%10 İndirim Kuponu',
            description: 'Tüm ürünlerde geçerli indirim kuponu',
            pointsRequired: 100,
            currentPoints: 75,
        },
        {
            id: 2,
            title: 'Ücretsiz Kahve',
            description: 'Dilediğiniz şubemizde geçerli kahve kuponu',
            pointsRequired: 50,
            currentPoints: 50,
        },
        {
            id: 3,
            title: 'VIP Üyelik',
            description: '1 aylık VIP üyelik hakkı',
            pointsRequired: 500,
            currentPoints: 150,
        },
    ];

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Ödüller
                </Typography>
                <Typography variant="h6" color="primary">
                    Mevcut Puanınız: 150
                </Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
                {rewards.map((reward) => (
                    <Card key={reward.id}>
                        <CardContent>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    mb: 2,
                                }}
                            >
                                <TrophyIcon
                                    color="primary"
                                    sx={{ fontSize: 40, mr: 1 }}
                                />
                                <Typography variant="h6" component="h2">
                                    {reward.title}
                                </Typography>
                            </Box>
                            <Typography color="text.secondary" sx={{ mb: 2 }}>
                                {reward.description}
                            </Typography>
                            <Box sx={{ mb: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                    İlerleme: {reward.currentPoints} / {reward.pointsRequired} puan
                                </Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={(reward.currentPoints / reward.pointsRequired) * 100}
                                    sx={{ mt: 1 }}
                                />
                            </Box>
                        </CardContent>
                        <CardActions>
                            <Button
                                fullWidth
                                variant="contained"
                                color="primary"
                                disabled={reward.currentPoints < reward.pointsRequired}
                            >
                                {reward.currentPoints >= reward.pointsRequired
                                    ? 'Ödülü Al'
                                    : `${reward.pointsRequired - reward.currentPoints} Puan Daha Gerekli`}
                            </Button>
                        </CardActions>
                    </Card>
                ))}
            </Box>
        </Container>
    );
};

export default Rewards; 