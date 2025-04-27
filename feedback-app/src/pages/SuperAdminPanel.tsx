import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
    Container,
    Grid,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    IconButton,
    Box,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    CircularProgress,
    Alert,
    Stack,
    useTheme,
    useMediaQuery
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Check as CheckIcon,
    Close as CloseIcon,
    Business as BusinessIcon,
    Group as GroupIcon,
    Poll as PollIcon,
    Add as AddIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Business } from '../types/Business';
import { User } from '../types/User';
import { businessService } from '../services/businessService';
import { userService } from '../services/userService';
import { surveyService } from '../services/surveyService';
import { UserRole } from '../types/UserRole';
import { formatDate } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';

// Custom hook to handle resize observer
const useResizeObserverFix = () => {
    useLayoutEffect(() => {
        // Workaround for ResizeObserver loop limit exceeded
        const resizeObserverError = (error: ErrorEvent) => {
            if (error.message === 'ResizeObserver loop completed with undelivered notifications.') {
                const resizeObserverErrDiv = document.getElementById('webpack-dev-server-client-overlay-div');
                const resizeObserverErr = document.getElementById('webpack-dev-server-client-overlay');
                if (resizeObserverErr) {
                    resizeObserverErr.style.display = 'none';
                }
                if (resizeObserverErrDiv) {
                    resizeObserverErrDiv.style.display = 'none';
                }
            }
        };

        window.addEventListener('error', resizeObserverError);

        return () => {
            window.removeEventListener('error', resizeObserverError);
        };
    }, []);
};

const SuperAdminPanel: React.FC = () => {
    useResizeObserverFix();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTab, setSelectedTab] = useState<'businesses' | 'users'>('businesses');
    const [stats, setStats] = useState({
        totalBusinesses: 0,
        activeBusinesses: 0,
        totalUsers: 0,
        totalSurveys: 0
    });

    useEffect(() => {
        // Check authentication and role
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        if (user?.role !== UserRole.SUPER_ADMIN) {
            navigate('/');
            return;
        }
        fetchData();
    }, [isAuthenticated, user, navigate]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('Fetching data...');

            const [businessesData, usersData] = await Promise.all([
                businessService.getBusinesses(),
                userService.getUsers()
            ]);

            console.log('Fetched businesses:', businessesData);
            console.log('Fetched users:', usersData);

            if (Array.isArray(businessesData)) {
                setBusinesses(businessesData);
            } else {
                console.error('Businesses data is not an array:', businessesData);
                setError('İşletme verileri yüklenirken bir hata oluştu');
            }

            if (Array.isArray(usersData)) {
                setUsers(usersData);
            } else {
                console.error('Users data is not an array:', usersData);
                setError('Kullanıcı verileri yüklenirken bir hata oluştu');
            }

            // Calculate statistics
            setStats({
                totalBusinesses: Array.isArray(businessesData) ? businessesData.length : 0,
                activeBusinesses: Array.isArray(businessesData) ? businessesData.filter(b => b.isActive && b.isApproved).length : 0,
                totalUsers: Array.isArray(usersData) ? usersData.length : 0,
                totalSurveys: 0 // Will be updated when survey service is ready
            });

        } catch (err: any) {
            console.error('Error in fetchData:', err);
            setError(err.message || 'Veri yüklenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveBusiness = async (businessId: string) => {
        try {
            await businessService.approveBusiness(businessId);
            await fetchData();
        } catch (err: any) {
            setError(err.message || 'İşletme onaylanırken bir hata oluştu');
        }
    };

    const handleDeleteBusiness = async (businessId: string) => {
        if (window.confirm('Bu işletmeyi silmek istediğinizden emin misiniz?')) {
            try {
                await businessService.deleteBusiness(businessId);
                await fetchData();
            } catch (err: any) {
                setError(err.message || 'İşletme silinirken bir hata oluştu');
            }
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (window.confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
            try {
                await userService.deleteUser(userId);
                await fetchData();
            } catch (err: any) {
                setError(err.message || 'Kullanıcı silinirken bir hata oluştu');
            }
        }
    };

    if (!isAuthenticated || user?.role !== UserRole.SUPER_ADMIN) {
        return null;
    }

    if (loading) {
        return (
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                    <Button color="inherit" size="small" onClick={fetchData} sx={{ ml: 2 }}>
                        Yeniden Dene
                    </Button>
                </Alert>
            )}

            {/* İstatistik Kartları */}
            <Grid container spacing={isMobile ? 2 : 3} mb={4}>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        sx={{
                            p: isMobile ? 1.5 : 2,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            bgcolor: 'primary.light',
                            color: 'white',
                            height: '100%'
                        }}
                    >
                        <BusinessIcon sx={{ fontSize: isMobile ? 32 : 40, mb: 1 }} />
                        <Typography variant={isMobile ? "subtitle1" : "h6"}>Toplam İşletme</Typography>
                        <Typography variant={isMobile ? "h5" : "h4"}>{stats.totalBusinesses}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: 'success.light', color: 'white' }}>
                        <CheckIcon sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="h6">Aktif İşletme</Typography>
                        <Typography variant="h4">{stats.activeBusinesses}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: 'info.light', color: 'white' }}>
                        <GroupIcon sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="h6">Toplam Kullanıcı</Typography>
                        <Typography variant="h4">{stats.totalUsers}</Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', bgcolor: 'warning.light', color: 'white' }}>
                        <PollIcon sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="h6">Toplam Anket</Typography>
                        <Typography variant="h4">{stats.totalSurveys}</Typography>
                    </Paper>
                </Grid>
            </Grid>

            {/* Sekmeler ve Yeni Ekle Butonu */}
            <Box
                sx={{
                    mb: 2,
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? 1 : 0,
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'stretch' : 'center'
                }}
            >
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        fullWidth={isMobile}
                        variant={selectedTab === 'businesses' ? 'contained' : 'outlined'}
                        onClick={() => setSelectedTab('businesses')}
                    >
                        İşletmeler
                    </Button>
                    <Button
                        fullWidth={isMobile}
                        variant={selectedTab === 'users' ? 'contained' : 'outlined'}
                        onClick={() => setSelectedTab('users')}
                    >
                        Kullanıcılar
                    </Button>
                </Box>
                <Button
                    fullWidth={isMobile}
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => navigate(selectedTab === 'businesses' ? '/admin/businesses' : '/admin/users')}
                >
                    {selectedTab === 'businesses' ? 'Yeni İşletme' : 'Yeni Kullanıcı'}
                </Button>
            </Box>

            {/* İşletmeler Tablosu */}
            {selectedTab === 'businesses' && (
                <TableContainer component={Paper}>
                    <Table size={isMobile ? "small" : "medium"}>
                        <TableHead>
                            <TableRow>
                                <TableCell>İşletme Adı</TableCell>
                                <TableCell>E-posta</TableCell>
                                <TableCell>Telefon</TableCell>
                                <TableCell>Durum</TableCell>
                                <TableCell>Kayıt Tarihi</TableCell>
                                <TableCell>İşlemler</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {businesses.map((business) => (
                                <TableRow key={business._id}>
                                    <TableCell>{business.name}</TableCell>
                                    <TableCell>{business.email}</TableCell>
                                    <TableCell>{business.phone}</TableCell>
                                    <TableCell>
                                        <Stack direction="row" spacing={1}>
                                            <Chip
                                                label={business.isActive ? 'Aktif' : 'Pasif'}
                                                color={business.isActive ? 'success' : 'default'}
                                                size="small"
                                            />
                                            <Chip
                                                label={business.isApproved ? 'Onaylı' : 'Onay Bekliyor'}
                                                color={business.isApproved ? 'primary' : 'warning'}
                                                size="small"
                                            />
                                        </Stack>
                                    </TableCell>
                                    <TableCell>{formatDate(business.createdAt)}</TableCell>
                                    <TableCell>
                                        <IconButton
                                            size="small"
                                            onClick={() => navigate(`/admin/businesses/${business._id}`)}
                                            color="info"
                                            title="Detaylar"
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        {!business.isApproved && (
                                            <IconButton
                                                size="small"
                                                onClick={() => handleApproveBusiness(business._id)}
                                                color="success"
                                                title="Onayla"
                                            >
                                                <CheckIcon />
                                            </IconButton>
                                        )}
                                        <IconButton
                                            size="small"
                                            onClick={() => handleDeleteBusiness(business._id)}
                                            color="error"
                                            title="Sil"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Kullanıcılar Tablosu */}
            {selectedTab === 'users' && (
                <TableContainer component={Paper}>
                    <Table size={isMobile ? "small" : "medium"}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Ad Soyad</TableCell>
                                <TableCell>E-posta</TableCell>
                                <TableCell>Rol</TableCell>
                                <TableCell>Durum</TableCell>
                                <TableCell>Kayıt Tarihi</TableCell>
                                <TableCell>İşlemler</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user._id}>
                                    <TableCell>{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={
                                                user.role === UserRole.SUPER_ADMIN
                                                    ? 'Süper Admin'
                                                    : user.role === UserRole.BUSINESS_ADMIN
                                                        ? 'İşletme Admini'
                                                        : 'Müşteri'
                                            }
                                            color={
                                                user.role === UserRole.SUPER_ADMIN
                                                    ? 'error'
                                                    : user.role === UserRole.BUSINESS_ADMIN
                                                        ? 'primary'
                                                        : 'success'
                                            }
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={user.isActive ? 'Aktif' : 'Pasif'}
                                            color={user.isActive ? 'success' : 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                                    <TableCell>
                                        <IconButton
                                            size="small"
                                            onClick={() => navigate(`/admin/users/${user._id}`)}
                                            color="info"
                                            title="Düzenle"
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        {user.role !== UserRole.SUPER_ADMIN && (
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDeleteUser(user._id)}
                                                color="error"
                                                title="Sil"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Container>
    );
};

export default SuperAdminPanel; 