import React from 'react';
import {
    Container,
    Paper,
    Typography,
    Card,
    CardHeader,
    CardContent,
    Stack,
    Box,
} from '@mui/material';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

const Dashboard: React.FC = () => {
    const data = [
        { name: 'Ocak', responses: 65 },
        { name: 'Şubat', responses: 59 },
        { name: 'Mart', responses: 80 },
        { name: 'Nisan', responses: 81 },
        { name: 'Mayıs', responses: 56 },
        { name: 'Haziran', responses: 55 },
    ];

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Stack spacing={3}>
                {/* Özet Kartları */}
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                    <Paper
                        sx={{
                            p: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            height: 140,
                            flex: 1,
                        }}
                    >
                        <Typography component="h2" variant="h6" color="primary" gutterBottom>
                            Toplam Anket
                        </Typography>
                        <Typography component="p" variant="h4">
                            24
                        </Typography>
                    </Paper>
                    <Paper
                        sx={{
                            p: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            height: 140,
                            flex: 1,
                        }}
                    >
                        <Typography component="h2" variant="h6" color="primary" gutterBottom>
                            Toplam Yanıt
                        </Typography>
                        <Typography component="p" variant="h4">
                            150
                        </Typography>
                    </Paper>
                    <Paper
                        sx={{
                            p: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            height: 140,
                            flex: 1,
                        }}
                    >
                        <Typography component="h2" variant="h6" color="primary" gutterBottom>
                            Ortalama Puan
                        </Typography>
                        <Typography component="p" variant="h4">
                            4.5
                        </Typography>
                    </Paper>
                </Stack>

                {/* Grafik */}
                <Paper sx={{ p: 2 }}>
                    <Typography component="h2" variant="h6" color="primary" gutterBottom>
                        Aylık Yanıt İstatistikleri
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data}>
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="responses" stroke="#8884d8" />
                        </LineChart>
                    </ResponsiveContainer>
                </Paper>

                {/* Son Anketler */}
                <Card>
                    <CardHeader title="Son Anketler" />
                    <CardContent>
                        <Stack direction="row" flexWrap="wrap" gap={2}>
                            {[1, 2, 3].map((survey) => (
                                <Box key={survey} sx={{ width: { xs: '100%', sm: '45%', md: '30%' } }}>
                                    <Paper sx={{ p: 2 }}>
                                        <Typography variant="h6" gutterBottom>
                                            Anket {survey}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Son güncelleme: {new Date().toLocaleDateString()}
                                        </Typography>
                                    </Paper>
                                </Box>
                            ))}
                        </Stack>
                    </CardContent>
                </Card>
            </Stack>
        </Container>
    );
};

export default Dashboard; 