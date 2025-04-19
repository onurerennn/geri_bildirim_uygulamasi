import React from 'react';
import {
    Container,
    Card,
    CardContent,
    CardActions,
    Typography,
    Button,
    IconButton,
    Box,
    Fab,
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    QrCode as QrCodeIcon,
    Add as AddIcon,
} from '@mui/icons-material';

const Surveys: React.FC = () => {
    // Örnek anket verileri
    const surveys = [
        {
            id: 1,
            title: 'Müşteri Memnuniyeti Anketi',
            description: 'Hizmet kalitemizi değerlendirin',
            responseCount: 150,
            createdAt: '2024-04-01',
        },
        {
            id: 2,
            title: 'Ürün Değerlendirme Anketi',
            description: 'Yeni ürünümüz hakkında görüşleriniz',
            responseCount: 75,
            createdAt: '2024-04-02',
        },
        {
            id: 3,
            title: 'Çalışan Memnuniyeti Anketi',
            description: 'İş ortamı değerlendirmesi',
            responseCount: 45,
            createdAt: '2024-04-03',
        },
    ];

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
                <Typography variant="h4" component="h1">
                    Anketler
                </Typography>
                <Fab color="primary" aria-label="add">
                    <AddIcon />
                </Fab>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
                {surveys.map((survey) => (
                    <Card key={survey.id}>
                        <CardContent>
                            <Typography variant="h6" component="h2">
                                {survey.title}
                            </Typography>
                            <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                                {survey.description}
                            </Typography>
                            <Typography variant="body2">
                                Toplam Yanıt: {survey.responseCount}
                            </Typography>
                            <Typography variant="body2">
                                Oluşturulma: {survey.createdAt}
                            </Typography>
                        </CardContent>
                        <CardActions>
                            <IconButton size="small" color="primary">
                                <EditIcon />
                            </IconButton>
                            <IconButton size="small" color="primary">
                                <QrCodeIcon />
                            </IconButton>
                            <IconButton size="small" color="error">
                                <DeleteIcon />
                            </IconButton>
                            <Button size="small" color="primary" sx={{ marginLeft: 'auto' }}>
                                Detaylar
                            </Button>
                        </CardActions>
                    </Card>
                ))}
            </Box>
        </Container>
    );
};

export default Surveys; 