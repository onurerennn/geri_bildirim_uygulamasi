import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Button,
    CircularProgress,
    IconButton,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    InputAdornment,
    Snackbar,
    Alert,
    Divider,
    Tooltip,
    Tabs,
    Tab
} from '@mui/material';
import {
    Add as AddIcon,
    Remove as RemoveIcon,
    Edit as EditIcon,
    Search as SearchIcon,
    EmojiEvents as RewardIcon,
    CheckCircle as ApproveIcon,
    Poll as PollIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import apiService from '../../services/api';
import moment from 'moment';

// Müşteri tipi
interface Customer {
    _id: string;
    name: string;
    email: string;
    points: number;
    completedSurveys: string[];
    responses: any[];
}

// Onay bekleyen yanıt tipi
interface PendingResponse {
    _id: string;
    survey: {
        _id: string;
        title: string;
        description: string;
        rewardPoints: number;
    };
    customer: {
        _id: string;
        name: string;
        email: string;
        points: number;
    };
    rewardPoints: number;
    createdAt: string;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const CustomerPoints: React.FC = () => {
    const { user } = useAuth();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [pendingApprovals, setPendingApprovals] = useState<PendingResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [approvalsLoading, setApprovalsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [openApproveDialog, setOpenApproveDialog] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [selectedResponse, setSelectedResponse] = useState<PendingResponse | null>(null);
    const [pointsOperation, setPointsOperation] = useState<'add' | 'subtract' | 'set'>('add');
    const [pointsAmount, setPointsAmount] = useState<number>(0);
    const [approvedPoints, setApprovedPoints] = useState<number>(0);
    const [tabValue, setTabValue] = useState(0);

    useEffect(() => {
        if (user && user.business) {
            fetchCustomers(user.business);
            fetchPendingApprovals();
        }
    }, [user]);

    const fetchCustomers = async (businessId: string) => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/users/business/${businessId}/customers`);

            if (response.data && response.data.success) {
                setCustomers(response.data.data);
                console.log('Müşteriler yüklendi:', response.data.data);
            } else {
                setError('Müşteri listesi yüklenemedi');
                // API yanıt hatası durumunda boş liste göster
                setCustomers([]);
            }
        } catch (err: any) {
            console.error('Müşteri listesi alma hatası:', err);
            setError(err.message || 'Müşteri listesi yüklenirken bir hata oluştu');
            // Hata durumunda boş liste göster
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingApprovals = async () => {
        try {
            setApprovalsLoading(true);
            const response = await axios.get('/api/surveys/business/pending-approvals');

            if (response.data && response.data.success) {
                setPendingApprovals(response.data.data);
                console.log('Onay bekleyen yanıtlar:', response.data.data);
            } else {
                console.error('Onay bekleyen yanıtlar alınamadı');
            }
        } catch (err: any) {
            console.error('Onay bekleyen yanıtları alma hatası:', err);
        } finally {
            setApprovalsLoading(false);
        }
    };

    const handleOpenPointsDialog = (customer: Customer) => {
        setSelectedCustomer(customer);
        setPointsAmount(0);
        setPointsOperation('add');
        setOpenDialog(true);
    };

    const handleOpenApproveDialog = (response: PendingResponse) => {
        setSelectedResponse(response);
        setApprovedPoints(response.rewardPoints);
        setOpenApproveDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedCustomer(null);
    };

    const handleCloseApproveDialog = () => {
        setOpenApproveDialog(false);
        setSelectedResponse(null);
    };

    const handleUpdatePoints = async () => {
        if (!selectedCustomer) return;

        try {
            setLoading(true);
            const response = await axios.patch(`/api/users/${selectedCustomer._id}/reward-points`, {
                points: pointsAmount,
                operation: pointsOperation
            });

            if (response.data && response.data.success) {
                setSuccess(`${selectedCustomer.name} kullanıcısının puanları güncellendi.`);

                // Güncellenmiş müşteri listesini al
                if (user && user.business) {
                    fetchCustomers(user.business);
                }

                handleCloseDialog();
            } else {
                setError('Puanlar güncellenirken bir hata oluştu.');
            }
        } catch (err: any) {
            console.error('Puan güncelleme hatası:', err);
            setError(err.message || 'Puanlar güncellenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleApprovePoints = async () => {
        if (!selectedResponse) return;

        try {
            setLoading(true);
            const response = await axios.patch(`/api/surveys/responses/${selectedResponse._id}/approve-points`, {
                approvedPoints
            });

            if (response.data && response.data.success) {
                setSuccess(`${selectedResponse.customer.name} kullanıcısına puan onaylandı.`);

                // Güncellenmiş onay listesini ve müşteri listesini al
                fetchPendingApprovals();
                if (user && user.business) {
                    fetchCustomers(user.business);
                }

                handleCloseApproveDialog();
            } else {
                setError('Puanlar onaylanırken bir hata oluştu.');
            }
        } catch (err: any) {
            console.error('Puan onaylama hatası:', err);
            setError(err.message || 'Puanlar onaylanırken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const filteredCustomers = customers.filter(customer =>
        customer.name.toLowerCase().includes(search.toLowerCase()) ||
        customer.email.toLowerCase().includes(search.toLowerCase())
    );

    const getOperationText = () => {
        if (pointsOperation === 'add') {
            return 'Ekle';
        } else if (pointsOperation === 'subtract') {
            return 'Çıkar';
        } else {
            return 'Değiştir';
        }
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleCloseSnackbar = () => {
        setError(null);
        setSuccess(null);
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Müşteri Puanları
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
                İşletmenizin müşterilerinin puanlarını yönetin ve takip edin.
            </Typography>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tabValue} onChange={handleTabChange}>
                    <Tab label="Müşteri Listesi" />
                    <Tab
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <span>Onay Bekleyenler</span>
                                {pendingApprovals.length > 0 && (
                                    <Chip
                                        label={pendingApprovals.length}
                                        color="warning"
                                        size="small"
                                        sx={{ ml: 1 }}
                                    />
                                )}
                            </Box>
                        }
                    />
                </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
                <Box sx={{ mb: 4 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Müşteri Ara"
                                variant="outlined"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                    </Grid>
                </Box>

                {loading && !customers.length ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Müşteri</TableCell>
                                    <TableCell>E-posta</TableCell>
                                    <TableCell align="center">Katıldığı Anketler</TableCell>
                                    <TableCell align="center">
                                        <Box display="flex" alignItems="center" justifyContent="center">
                                            <RewardIcon sx={{ mr: 1 }} />
                                            Puanlar
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center">İşlemler</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredCustomers.length > 0 ? (
                                    filteredCustomers.map((customer) => (
                                        <TableRow key={customer._id}>
                                            <TableCell>{customer.name}</TableCell>
                                            <TableCell>{customer.email}</TableCell>
                                            <TableCell align="center">
                                                {customer.completedSurveys ? customer.completedSurveys.length : 0}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip
                                                    label={customer.points || 0}
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="Puanları Düzenle">
                                                    <IconButton
                                                        onClick={() => handleOpenPointsDialog(customer)}
                                                        color="primary"
                                                    >
                                                        <EditIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            {search ? 'Aranan kriterlere uygun müşteri bulunamadı.' : 'Henüz müşteri bulunmuyor.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
                {approvalsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : pendingApprovals.length > 0 ? (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Müşteri</TableCell>
                                    <TableCell>Anket</TableCell>
                                    <TableCell align="center">Tarih</TableCell>
                                    <TableCell align="center">
                                        <Box display="flex" alignItems="center" justifyContent="center">
                                            <RewardIcon sx={{ mr: 1 }} />
                                            Önerilen Puan
                                        </Box>
                                    </TableCell>
                                    <TableCell align="center">İşlemler</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pendingApprovals.map((response) => (
                                    <TableRow key={response._id}>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="bold">
                                                {response.customer.name}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                {response.customer.email}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {response.survey && response.survey.title ? response.survey.title : 'Yanıt Formu'}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                                                {response.survey && response.survey.description ?
                                                    (response.survey.description.substring(0, 60) +
                                                        (response.survey.description.length > 60 ? '...' : '')) :
                                                    ''}
                                            </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                            {moment(response.createdAt).format('DD.MM.YYYY HH:mm')}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={response.rewardPoints || 0}
                                                color="warning"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Puanları Onayla">
                                                <IconButton
                                                    onClick={() => handleOpenApproveDialog(response)}
                                                    color="success"
                                                >
                                                    <ApproveIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Alert severity="info">
                        Onay bekleyen puan bulunmuyor.
                    </Alert>
                )}
            </TabPanel>

            {/* Puan Düzenleme Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog}>
                <DialogTitle>Puanları Düzenle</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        <b>{selectedCustomer?.name}</b> adlı müşterinin mevcut puanı: <b>{selectedCustomer?.points || 0}</b>
                    </DialogContentText>

                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>İşlem</InputLabel>
                                <Select
                                    value={pointsOperation}
                                    onChange={(e) => setPointsOperation(e.target.value as 'add' | 'subtract' | 'set')}
                                    label="İşlem"
                                >
                                    <MenuItem value="add">Puan Ekle</MenuItem>
                                    <MenuItem value="subtract">Puan Çıkar</MenuItem>
                                    <MenuItem value="set">Puanı Değiştir</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Puan"
                                type="number"
                                value={pointsAmount}
                                onChange={(e) => setPointsAmount(Math.max(0, parseInt(e.target.value) || 0))}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            {pointsOperation === 'add' ? <AddIcon /> :
                                                pointsOperation === 'subtract' ? <RemoveIcon /> :
                                                    <RewardIcon />}
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>İptal</Button>
                    <Button
                        onClick={handleUpdatePoints}
                        variant="contained"
                        color="primary"
                        disabled={loading || pointsAmount <= 0}
                    >
                        {loading ? (
                            <CircularProgress size={24} />
                        ) : (
                            `Puanları ${getOperationText()}`
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Puan Onaylama Dialog */}
            <Dialog open={openApproveDialog} onClose={handleCloseApproveDialog}>
                <DialogTitle>Puanları Onayla</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        <b>{selectedResponse?.customer?.name}</b> adlı müşterinin {selectedResponse?.survey && selectedResponse.survey.title ? (
                            <b>{selectedResponse.survey.title}</b>
                        ) : (
                            <b>Yanıt Formu</b>
                        )} anketine yanıtını onaylayın.
                    </DialogContentText>

                    <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                            Müşteri Bilgileri:
                        </Typography>
                        <Typography variant="body2">
                            <b>Ad:</b> {selectedResponse?.customer?.name}
                        </Typography>
                        <Typography variant="body2">
                            <b>E-posta:</b> {selectedResponse?.customer?.email}
                        </Typography>
                        <Typography variant="body2">
                            <b>Mevcut Puanı:</b> {selectedResponse?.customer?.points || 0}
                        </Typography>
                    </Box>

                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                        Onaylanacak Puan:
                    </Typography>
                    <TextField
                        fullWidth
                        label="Puan"
                        type="number"
                        value={approvedPoints}
                        onChange={(e) => setApprovedPoints(Math.max(0, parseInt(e.target.value) || 0))}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <RewardIcon />
                                </InputAdornment>
                            ),
                        }}
                        helperText={`Anketteki önerilen puan: ${selectedResponse?.survey?.rewardPoints || 0}`}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseApproveDialog}>İptal</Button>
                    <Button
                        onClick={handleApprovePoints}
                        variant="contained"
                        color="success"
                        startIcon={<ApproveIcon />}
                        disabled={loading || approvedPoints < 0}
                    >
                        {loading ? (
                            <CircularProgress size={24} />
                        ) : (
                            'Puanları Onayla'
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Bildirimler */}
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

export default CustomerPoints; 