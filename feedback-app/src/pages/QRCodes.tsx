import React from 'react';
import {
    Container,
    Card,
    CardContent,
    Typography,
    Stack,
    Box,
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';

const QRCodes: React.FC = () => {
    // Örnek QR kod verileri
    const qrCodes = [
        { id: 1, title: 'Restoran Değerlendirme', url: 'https://feedback.app/survey/1' },
        { id: 2, title: 'Otel Değerlendirme', url: 'https://feedback.app/survey/2' },
        { id: 3, title: 'Hizmet Değerlendirme', url: 'https://feedback.app/survey/3' },
    ];

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Stack spacing={3}>
                <Typography variant="h4" component="h1" gutterBottom>
                    QR Kodlar
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={2}>
                    {qrCodes.map((qr) => (
                        <Box key={qr.id} sx={{ width: { xs: '100%', sm: '45%', md: '30%' } }}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" component="h2" gutterBottom>
                                        {qr.title}
                                    </Typography>
                                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                                        <QRCodeSVG value={qr.url} size={200} />
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">
                                        URL: {qr.url}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Box>
                    ))}
                </Stack>
            </Stack>
        </Container>
    );
};

export default QRCodes; 