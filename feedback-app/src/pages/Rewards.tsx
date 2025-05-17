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
    Chip,
    TextField
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
    const { user, updateProfile } = useAuth();
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

    // Puan kullanma diyaloğu için state'ler
    const [openPointsDialog, setOpenPointsDialog] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [selectedPoints, setSelectedPoints] = useState(0);
    const [pointsToUse, setPointsToUse] = useState(0);
    const [pointDescription, setPointDescription] = useState('Ödül kullanımı');

    // Güncel puan bilgisi için yeni state
    const [customerPointsMap, setCustomerPointsMap] = useState<{ [customerName: string]: number }>({});
    const [showUpdatedPoints, setShowUpdatedPoints] = useState(false);
    const [lastUpdatedCustomer, setLastUpdatedCustomer] = useState('');
    const [lastPointOperation, setLastPointOperation] = useState<{ used: number, remaining: number } | null>(null);
    const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);
    const [surveyTitleMap, setSurveyTitleMap] = useState<{ [surveyId: string]: string }>({});

    // Sayfa yüklendiğinde anketleri ve yanıtları getir
    useEffect(() => {
        // Kullanıcı oturum açmışsa, rolüne göre içerik yükle
        if (user) {
            if (user.role === UserRole.CUSTOMER) {
                fetchUserProfile();
                fetchRewards();
            } else if (user.role === UserRole.BUSINESS_ADMIN && user.business) {
                fetchSurveyResponses();
                fetchRewards(); // İşletmeye ait ödülleri getir
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
            console.log('🔍 Anket yanıtları ve müşteri puanları getiriliyor...');

            const response = await apiService.get(`/surveys/business/${user.business}/responses`);
            console.log('📊 API Yanıtı:', response.data);

            if (response.data && response.data.success) {
                // Anket başlıklarını haritaya ekle
                const tempSurveyTitleMap: { [surveyId: string]: string } = { ...surveyTitleMap };

                // API yanıtından anket başlıklarını topla
                if (response.data.data && Array.isArray(response.data.data)) {
                    response.data.data.forEach((resp: any) => {
                        if (resp.survey && resp.survey._id && resp.survey.title) {
                            tempSurveyTitleMap[resp.survey._id] = resp.survey.title;
                        }
                    });
                }

                // Haritayı güncelle
                setSurveyTitleMap(tempSurveyTitleMap);

                // API yanıtını düzenle
                const formattedResponses = response.data.data.map((resp: any) => {
                    // Eklenen hata ayıklama
                    console.log('Yanıt işleniyor:', {
                        id: resp._id,
                        customerName: resp.customer?.name || resp.customerName,
                        rewardPoints: resp.rewardPoints,
                        updatedRewardPoints: resp.updatedRewardPoints,
                        pointsApproved: resp.pointsApproved
                    });

                    // Survey verisini düzelt
                    const surveyId = resp.survey?._id || resp.surveyId;
                    let surveyTitle = resp.survey?.title || '';

                    if (!surveyTitle && surveyId && tempSurveyTitleMap[surveyId]) {
                        surveyTitle = tempSurveyTitleMap[surveyId];
                    }

                    return {
                        _id: resp._id,
                        surveyId: surveyId,
                        surveyTitle: surveyTitle,
                        customerId: resp.customer?._id || resp.userId,
                        customerName: resp.customer?.name || resp.customerName,
                        customerEmail: resp.customer?.email || resp.customerEmail,
                        rewardPoints: resp.rewardPoints || 0,
                        updatedRewardPoints: resp.updatedRewardPoints,
                        pointsApproved: resp.pointsApproved,
                        createdAt: resp.createdAt,
                        lastPointsUpdate: resp.lastPointsUpdate
                    };
                });

                setSurveyResponses(formattedResponses);

                // Müşteri puanlarını hesapla - önce tüm onaylı puanları topla
                const customerPointsTotal: { [customerName: string]: number } = {};
                const userPointsFromAPI: { [customerName: string]: number } = {};
                const updatedRewardPoints: { [customerName: string]: number } = {};

                // Önce tüm onaylı yanıtlardan puanları topla
                formattedResponses.forEach((resp: any) => {
                    if (resp.pointsApproved === true) {
                        const customerName = resp.customerName;
                        if (!customerPointsTotal[customerName]) {
                            customerPointsTotal[customerName] = 0;
                        }
                        customerPointsTotal[customerName] += resp.rewardPoints;
                    }
                });

                console.log('Müşteri toplam onaylı puanları:', customerPointsTotal);

                // API yanıtında kullanıcı puan bilgileri varsa bunları da al
                formattedResponses.forEach((resp: any) => {
                    const customerName = resp.customerName;

                    // Eğer yanıtta updatedRewardPoints varsa bunu da kaydet (en yüksek öncelik)
                    if (resp.updatedRewardPoints !== undefined) {
                        updatedRewardPoints[customerName] = resp.updatedRewardPoints;
                        console.log(`📊 ${customerName} için updatedRewardPoints: ${resp.updatedRewardPoints}`);
                    }

                    // Eğer API'den gelen yanıtta user.points varsa ve updatedRewardPoints yoksa bunu kullan
                    if (resp.customer && typeof resp.customer.points === 'number' && updatedRewardPoints[customerName] === undefined) {
                        userPointsFromAPI[customerName] = resp.customer.points;
                        console.log(`📊 ${customerName} için customer.points: ${resp.customer.points}`);
                    }

                    // Son güncelleme tarihini kontrol et ve logla
                    if (resp.lastPointsUpdate) {
                        console.log(`📊 ${customerName} için son puan güncellemesi: ${new Date(resp.lastPointsUpdate).toLocaleString()}`);
                    }
                });

                console.log('API\'den alınan veriler:', {
                    userPoints: userPointsFromAPI,
                    updatedRewardPoints: updatedRewardPoints
                });

                // En güncel puan verilerini almak için ek bir istek daha yap
                try {
                    console.log('🔍 Müşteri puanları için ek sorgu yapılıyor...');
                    const customersResponse = await apiService.get(`/users/business/${user.business}/customers`);

                    if (customersResponse.data && customersResponse.data.success && Array.isArray(customersResponse.data.data)) {
                        console.log('📊 Müşteri API Yanıtı:', customersResponse.data);

                        // Müşteri verilerinden en güncel puanları al
                        customersResponse.data.data.forEach((customer: any) => {
                            if (customer.name && (customer.points !== undefined || customer.rewardPoints !== undefined)) {
                                // Öncelikle rewardPoints kullan, yoksa points değerini kullan
                                const customerPoints = customer.rewardPoints !== undefined ? customer.rewardPoints : customer.points;

                                // Eğer puan değeri geçerliyse güncelle
                                if (customerPoints !== undefined && customerPoints !== null) {
                                    console.log(`📊 Müşteri API'si: ${customer.name} için puan: ${customerPoints}`);

                                    // En güncel değeri almış olduğumuz için direkt olarak puan haritasını güncelle
                                    setCustomerPointsMap(prevMap => ({
                                        ...prevMap,
                                        [customer.name]: customerPoints
                                    }));

                                    // Aynı zamanda bizim topladığımız değer haritasını da güncelle (sonraki kullanım için)
                                    updatedRewardPoints[customer.name] = customerPoints;
                                }
                            }
                        });
                    }
                } catch (customerError) {
                    console.error('Müşteri puan bilgileri getirme hatası:', customerError);
                }

                // Puanları birleştir - Öncelik sırası: 
                // 1) updatedRewardPoints (en güncel veri)
                // 2) API user.points 
                // 3) Hesaplanan puanlar
                const combinedPointsMap = { ...customerPointsTotal };

                // Önce updatedRewardPoints değerlerini ekle (en yüksek öncelik)
                Object.keys(updatedRewardPoints).forEach(customer => {
                    combinedPointsMap[customer] = updatedRewardPoints[customer];
                });

                // Sonra API'den gelen user.points değerlerini ekle (updatedRewardPoints yoksa)
                Object.keys(userPointsFromAPI).forEach(customer => {
                    if (updatedRewardPoints[customer] === undefined) {
                        combinedPointsMap[customer] = userPointsFromAPI[customer];
                    }
                });

                console.log('Birleştirilmiş puan haritası:', combinedPointsMap);

                // CustomPointsMap'i güncelle
                Object.keys(combinedPointsMap).forEach(customer => {
                    const currentPoints = customerPointsMap[customer] || 0;
                    const newPoints = combinedPointsMap[customer];

                    if (currentPoints !== newPoints) {
                        console.log(`✅ ${customer} için puan güncellendi: ${currentPoints} -> ${newPoints}`);
                        setCustomerPointsMap(prevMap => ({
                            ...prevMap,
                            [customer]: newPoints
                        }));
                    }
                });

                console.log('Güncellenmiş müşteri puan haritası:', customerPointsMap);
            } else {
                console.error('API yanıtında hata:', response.data);
            }
            setResponsesLoading(false);
        } catch (error) {
            console.error('Yanıtları getirirken hata:', error);
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

    // Puan kullanma işlemleri
    const handleUsePoints = (customer: string, points: number) => {
        console.log('Puan kullanma diyaloğu açılıyor:', {
            müşteri: customer,
            mevcutPuan: points
        });

        setSelectedCustomer(customer);
        setSelectedPoints(points);
        setPointsToUse(0); // Sıfırla
        setPointDescription('Ödül kullanımı');
        setOpenPointsDialog(true);
    };

    const confirmUsePoints = async () => {
        if (!selectedCustomer || pointsToUse <= 0 || pointsToUse > selectedPoints) {
            return;
        }

        console.log('Puan kullanma isteği gönderiliyor:', {
            müşteri: selectedCustomer,
            kullanılacakPuan: pointsToUse,
            mevcutPuan: selectedPoints,
            açıklama: pointDescription
        });

        try {
            setLoading(true);

            // Backend API'ye istek at
            const response = await apiService.post('/users/use-points', {
                customerName: selectedCustomer,
                points: pointsToUse,
                description: pointDescription
            });

            console.log('API Yanıtı:', response.data);

            if (response.data && response.data.success) {
                // API'den gelen güncel puan değerlerini al
                const remainingPoints = response.data.data.remainingPoints;
                const updatedRewardPoints = response.data.data.updatedRewardPoints || remainingPoints;

                console.log('Güncel puan bilgileri:', {
                    remainingPoints,
                    updatedRewardPoints,
                    kullanılanPuan: response.data.data.usedPoints,
                });

                // Müşteri puan haritasını API'den gelen değerle hemen güncelle - rewardPoints tercih et
                setCustomerPointsMap(prevMap => ({
                    ...prevMap,
                    [selectedCustomer]: updatedRewardPoints
                }));

                // Kullanıcı kendi puanını kullanıyorsa, kullanıcı state'ini de güncelle
                if (user && user.name === selectedCustomer) {
                    setUserPoints(updatedRewardPoints);
                }

                // Son işlem bilgilerini state'e kaydet (gösterim için)
                setLastUpdatedCustomer(selectedCustomer);
                setLastPointOperation({
                    used: pointsToUse,
                    remaining: updatedRewardPoints
                });
                setShowUpdatedPoints(true);

                // Başarılı mesajı göster
                setSuccess(`${selectedCustomer} için ${response.data.data.usedPoints} puan başarıyla kullanıldı. Kalan puan: ${updatedRewardPoints}`);

                // Modal'ı kapat
                setOpenPointsDialog(false);

                // Input değerlerini sıfırla
                setPointsToUse(0);
                setPointDescription('Ödül kullanımı');

                // Tek bir kez veri yenile, çoklu yenileme kaldırıldı
                console.log('🔄 Veriler bir kez yenileniyor...');
                fetchSurveyResponses();

                // Mevcut kullanıcı verileri de güncelle
                if (user && typeof updateProfile === 'function') {
                    console.log('👤 Kullanıcı profili güncelleniyor...');
                    updateProfile();
                }
            } else {
                // Hata mesajını göster
                setError(response.data.message || 'Puan kullanımı sırasında bir hata oluştu.');
            }
        } catch (error: any) {
            console.error('Puan kullanma hatası:', error);
            setError(error.response?.data?.message || error.message || 'Puan kullanımı sırasında bir hata oluştu.');
        } finally {
            setLoading(false);
        }
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
                    Anket Yanıtları ve Puanlar
                </Typography>
                <Button
                    variant="outlined"
                    color="primary"
                    onClick={fetchSurveyResponses}
                    startIcon={<span role="img" aria-label="refresh">🔄</span>}
                >
                    Puanları Yenile
                </Button>
            </Box>

            {/* Güncel puan bilgisi görüntüleme */}
            {showUpdatedPoints && lastPointOperation && (
                <Paper
                    sx={{
                        p: 2,
                        mb: 3,
                        backgroundColor: 'success.light',
                        color: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                >
                    <Box>
                        <Typography variant="h6">
                            Son Puan Kullanımı
                        </Typography>
                        <Typography>
                            <b>Müşteri:</b> {lastUpdatedCustomer}
                        </Typography>
                        <Typography>
                            <b>Kullanılan Puan:</b> {lastPointOperation.used}
                        </Typography>
                        <Typography>
                            <b>Kalan Puan:</b> {lastPointOperation.remaining}
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        color="inherit"
                        size="small"
                        onClick={() => setShowUpdatedPoints(false)}
                        sx={{ color: 'success.dark' }}
                    >
                        Kapat
                    </Button>
                </Paper>
            )}

            <Paper sx={{ width: '100%', mb: 4 }}>
                {responsesLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : surveyResponses.length > 0 ? (
                    <>
                        <Box p={2} bgcolor="#f5f5f5">
                            <Typography variant="body2" color="textSecondary">
                                <strong>Not:</strong> Aşağıdaki puanlar, müşterilerin onaylanmış anket yanıtlarından hesaplanmıştır.
                                Güncel değilse "Puanları Yenile" butonuna tıklayabilirsiniz.
                            </Typography>
                        </Box>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: 'primary.light' }}>
                                        <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Müşteri</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Anket</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold', color: 'white' }}>Puan</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold', color: 'white' }}>İşlem</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {surveyResponses.map((response) => {
                                        // Müşterinin güncel puanını kontrol et
                                        const hasUpdatedPoints = customerPointsMap[response.customerName] !== undefined;
                                        const customerCurrentPoints = hasUpdatedPoints
                                            ? customerPointsMap[response.customerName]
                                            : response.rewardPoints;

                                        // Son güncellenen müşteri için vurgu yapmak için flag
                                        const isRecentlyUpdated = lastUpdatedCustomer === response.customerName;

                                        return (
                                            <TableRow
                                                key={response._id}
                                                hover
                                                sx={isRecentlyUpdated ? { backgroundColor: 'rgba(76, 175, 80, 0.1)' } : {}}
                                            >
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                                                        {response.customerName}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <PollIcon sx={{ mr: 1, color: 'info.main' }} />
                                                        {response.surveyTitle}
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={`${customerCurrentPoints} Puan`}
                                                        color={hasUpdatedPoints ? "warning" : "success"}
                                                        size="small"
                                                        sx={{ fontWeight: 'bold' }}
                                                    />
                                                    {hasUpdatedPoints && isRecentlyUpdated && (
                                                        <Typography variant="caption" display="block" color="text.secondary">
                                                            Güncel puan: {customerCurrentPoints}
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Button
                                                        variant="contained"
                                                        color="primary"
                                                        size="small"
                                                        onClick={() => handleUsePoints(response.customerName, customerCurrentPoints)}
                                                        disabled={customerCurrentPoints <= 0}
                                                    >
                                                        Puan Kullan
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </>
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

            {/* Puan kullanma diyaloğu */}
            <Dialog
                open={openPointsDialog}
                onClose={() => setOpenPointsDialog(false)}
                aria-labelledby="points-dialog-title"
            >
                <DialogTitle id="points-dialog-title">
                    Müşteri Puanı Kullan
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ minWidth: '400px', p: 1 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            <b>Müşteri:</b> {selectedCustomer}
                        </Typography>
                        <Typography variant="subtitle1" gutterBottom color={selectedPoints === 0 ? "error" : "inherit"}>
                            <b>Mevcut Puan:</b> {selectedPoints}
                            {selectedPoints === 0 && (
                                <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                                    Bu müşterinin kullanılabilir puanı bulunmamaktadır.
                                </Typography>
                            )}
                        </Typography>

                        <Box sx={{ mt: 3 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Kullanılacak Puan Miktarı:
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <input
                                    type="number"
                                    value={pointsToUse}
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        if (!isNaN(value)) {
                                            setPointsToUse(Math.min(value, selectedPoints));
                                        } else {
                                            setPointsToUse(0);
                                        }
                                    }}
                                    min="0"
                                    max={selectedPoints}
                                    style={{
                                        padding: '10px',
                                        fontSize: '16px',
                                        width: '100px',
                                        borderRadius: '4px',
                                        border: '1px solid #ccc'
                                    }}
                                />
                                <Typography variant="body1" sx={{ ml: 2 }}>
                                    / {selectedPoints} puan
                                </Typography>
                            </Box>

                            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                                Açıklama:
                            </Typography>
                            <TextField
                                fullWidth
                                value={pointDescription}
                                onChange={(e) => setPointDescription(e.target.value)}
                                placeholder="Puan kullanım açıklaması"
                                size="small"
                                margin="dense"
                            />
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenPointsDialog(false)} color="primary">
                        İptal
                    </Button>
                    <Button
                        onClick={confirmUsePoints}
                        color="primary"
                        variant="contained"
                        disabled={loading || pointsToUse <= 0 || pointsToUse > selectedPoints}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Puanları Kullan'}
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