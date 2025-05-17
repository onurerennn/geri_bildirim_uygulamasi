import React, { useState, useEffect } from 'react';
import {
    Container,
    Card,
    CardContent,
    CardActions,
    Typography,
    Button,
    Box,
    LinearProgress,
    CircularProgress,
    Alert,
    Snackbar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Paper,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    IconButton,
    Chip
} from '@mui/material';
import {
    EmojiEvents as TrophyIcon,
    Person as PersonIcon,
    PollOutlined as PollIcon,
    Info as InfoIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { UserRole } from '../types/UserRole';

// Ödül tipi
interface Reward {
    id: string;
    title: string;
    description: string;
    pointsRequired: number;
    imageUrl?: string;
    isActive: boolean;
    business: string;
}

// Anket cevabı tipi
interface SurveyResponse {
    _id: string;
    surveyId: string;
    surveyTitle: string;
    customerId: string;
    customerName: string;
    customerEmail: string;
    rewardPoints: number;
    pointsApproved: boolean | null;
    createdAt: string;
}

const Rewards: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);
    const [userPoints, setUserPoints] = useState(0);
    const [loading, setLoading] = useState(false);
    const [responsesLoading, setResponsesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

    useEffect(() => {
        // Kullanıcı oturum açmışsa, rolüne göre içerik yükle
        if (user) {
            if (user.role === UserRole.CUSTOMER) {
                fetchUserProfile();
                fetchRewards();
            } else if (user.role === UserRole.BUSINESS_ADMIN && user.business) {
                fetchSurveyResponses();
            }
        }
    }, [user]);

    const fetchUserProfile = async () => {
        try {
            setLoading(true);
            const response = await apiService.get('/users/profile');

            if (response.data && response.data.success) {
                setUserPoints(response.data.data.user.points || 0);
            } else {
                console.error('Profil bilgileri alınamadı');
            }
        } catch (error) {
            console.error('Profil yükleme hatası:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRewards = async () => {
        try {
            setLoading(true);
            // API endpoint'i kullanarak ödülleri getir
            const response = await apiService.get('/rewards');

            if (response.data && response.data.success) {
                setRewards(response.data.data);
            } else {
                console.error('Ödül verileri alınamadı');
                setRewards([]);
                setError('Ödül verileri yüklenemedi. Lütfen tekrar deneyin.');
            }
        } catch (error) {
            console.error('Ödüller yüklenirken hata oluştu:', error);
            setRewards([]);
            setError('Ödüller yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    const fetchSurveyResponses = async () => {
        if (!user?.business) return;
        try {
            setResponsesLoading(true);
            const response = await apiService.get(`/surveys/business/${user.business}/responses`);

            if (response.data && response.data.success) {
                // API yanıtını düzenle
                const formattedResponses = response.data.data.map((resp: any) => ({
                    _id: resp._id,
                    surveyId: resp.survey?._id || 'bilinmiyor',
                    surveyTitle: resp.survey?.title || 'Bilinmeyen Anket',
                    customerId: resp.customer?._id || 'bilinmiyor',
                    customerName: resp.customer?.name || 'Bilinmeyen Müşteri',
                    customerEmail: resp.customer?.email || '-',
                    rewardPoints: resp.rewardPoints || 0,
                    pointsApproved: resp.pointsApproved,
                    createdAt: resp.createdAt
                }));

                setSurveyResponses(formattedResponses);
            } else {
                setError('Anket yanıtları yüklenemedi');
                // API yanıt hatası durumunda boş liste göster
                setSurveyResponses([]);
            }
        } catch (err: any) {
            console.error('Anket yanıtları alma hatası:', err);
            setError(err.message || 'Anket yanıtları yüklenirken bir hata oluştu');
            // Hata durumunda boş liste göster, uygulama çökmesin
            setSurveyResponses([]);
        } finally {
            setResponsesLoading(false);
        }
    };

    const handleClaimReward = (reward: Reward) => {
        setSelectedReward(reward);
        setOpenDialog(true);
    };

    const confirmClaimReward = async () => {
        if (!selectedReward) return;

        try {
            setLoading(true);
            const response = await apiService.post(`/rewards/${selectedReward.id}/claim`);

            if (response.data && response.data.success) {
                setSuccess('Ödülünüzü başarıyla aldınız!');
                // Güncel puan bilgisini getir
                fetchUserProfile();
                setOpenDialog(false);
            } else {
                setError('Ödül talebiniz alınırken bir hata oluştu. Lütfen tekrar deneyin.');
            }
        } catch (error) {
            console.error('Ödül alınırken hata oluştu:', error);
            setError('Ödül alınırken bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedReward(null);
    };

    const handleCloseSnackbar = () => {
        setSuccess(null);
        setError(null);
    };

    // Müşteri İçeriği
    const renderCustomerContent = () => (
        <>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Ödüller
                </Typography>
                {loading && !userPoints ? (
                    <CircularProgress size={24} sx={{ mr: 2 }} />
                ) : (
                    <Typography variant="h6" color="primary" sx={{ display: 'flex', alignItems: 'center' }}>
                        <TrophyIcon sx={{ mr: 1 }} />
                        Mevcut Puanınız: {userPoints}
                    </Typography>
                )}
            </Box>

            {loading && !rewards.length ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                    <CircularProgress />
                </Box>
            ) : rewards.length > 0 ? (
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
                                        İlerleme: {userPoints} / {reward.pointsRequired} puan
                                    </Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={Math.min((userPoints / reward.pointsRequired) * 100, 100)}
                                        sx={{ mt: 1 }}
                                    />
                                </Box>
                            </CardContent>
                            <CardActions>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    color="primary"
                                    disabled={userPoints < reward.pointsRequired}
                                    onClick={() => handleClaimReward(reward)}
                                >
                                    {userPoints >= reward.pointsRequired
                                        ? 'Ödülü Al'
                                        : `${reward.pointsRequired - userPoints} Puan Daha Gerekli`}
                                </Button>
                            </CardActions>
                        </Card>
                    ))}
                </Box>
            ) : (
                <Alert severity="info">
                    Şu anda kullanılabilir ödül bulunamadı. Daha sonra tekrar kontrol edin.
                </Alert>
            )}
        </>
    );

    // İşletme Yöneticisi İçeriği
    const renderBusinessAdminContent = () => (
        <>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Anket Yanıtları Yönetimi
                </Typography>
            </Box>

            <Paper sx={{ width: '100%', mb: 4 }}>
                {responsesLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : surveyResponses.length > 0 ? (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: 'primary.light' }}>
                                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Anket</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Müşteri</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', color: 'white' }}>Puan</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', color: 'white' }}>Durum</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Yanıt Tarihi</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {surveyResponses.map((response) => (
                                    <TableRow key={response._id} hover>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <PollIcon sx={{ mr: 1, color: 'primary.main' }} />
                                                {response.surveyTitle}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <PersonIcon sx={{ mr: 1, color: 'info.main' }} />
                                                {response.customerName}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={`${response.rewardPoints} Puan`}
                                                color="success"
                                                size="small"
                                                sx={{ fontWeight: 'bold' }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            {response.pointsApproved === null ? (
                                                <Chip label="Bekliyor" color="warning" size="small" />
                                            ) : response.pointsApproved ? (
                                                <Chip label="Onaylandı" color="success" size="small" />
                                            ) : (
                                                <Chip label="Reddedildi" color="error" size="small" />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(response.createdAt).toLocaleDateString('tr-TR')}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <PollIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            Henüz anket yanıtı bulunmamaktadır
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Müşteriler anketlerinize yanıt verdiğinde burada listelenecektir.
                        </Typography>
                    </Box>
                )}
            </Paper>
        </>
    );

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {user?.role === UserRole.CUSTOMER
                ? renderCustomerContent()
                : renderBusinessAdminContent()
            }

            {/* Ödül alma dialog */}
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">
                    {selectedReward ? `"${selectedReward.title}" ödülünü almak istiyor musunuz?` : 'Ödül Al'}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        {selectedReward && (
                            <>
                                <Typography paragraph sx={{ mt: 1 }}>
                                    {selectedReward.description}
                                </Typography>
                                <Typography color="primary">
                                    Bu ödül için {selectedReward.pointsRequired} puan harcanacak.
                                </Typography>
                                <Typography paragraph sx={{ mt: 1 }}>
                                    Onayladıktan sonra, ödül kodunuz ekranda gösterilecektir.
                                </Typography>
                            </>
                        )}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} color="primary">
                        İptal
                    </Button>
                    <Button
                        onClick={confirmClaimReward}
                        color="primary"
                        variant="contained"
                        autoFocus
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Onayla'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Başarı ve hata bildirimleri */}
            <Snackbar
                open={!!success}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity="success" variant="filled">
                    {success}
                </Alert>
            </Snackbar>

            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity="error" variant="filled">
                    {error}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default Rewards; 