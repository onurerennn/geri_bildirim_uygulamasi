import React, { useState, useEffect, useRef } from 'react';
import {
    Container,
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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Chip,
    Box,
    Alert,
    CircularProgress
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CheckCircle as CheckCircleIcon,
    PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import {
    businessService,
    CreateBusinessData,
    UpdateBusinessData,
    CreateBusinessAdminData,
    BusinessListResponse,
    isBusinessListResponse
} from '../services/businessService';
import { Business } from '../types/Business';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/UserRole';
import { formatDate } from '../utils/dateUtils';

interface BusinessFormData extends CreateBusinessData {
    password: string;
}

interface AdminFormData extends CreateBusinessAdminData { }

// Debug komponenti
const DebugPanel = ({ logs }: { logs: string[] }) => {
    return (
        <Box
            sx={{
                position: 'fixed',
                bottom: 0,
                right: 0,
                width: '400px',
                maxHeight: '300px',
                overflow: 'auto',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: 2,
                fontSize: '12px',
                zIndex: 9999,
                borderTopLeftRadius: 8,
            }}
        >
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Debug Console:</Typography>
            <Box sx={{ maxHeight: '250px', overflow: 'auto' }}>
                {logs.map((log, index) => (
                    <Typography
                        key={index}
                        variant="body2"
                        component="div"
                        sx={{
                            mb: 0.5,
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all'
                        }}
                    >
                        {log}
                    </Typography>
                ))}
            </Box>
        </Box>
    );
};

const Businesses = () => {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [open, setOpen] = useState(false);
    const [adminDialogOpen, setAdminDialogOpen] = useState(false);
    const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
    const [formData, setFormData] = useState<BusinessFormData>({
        name: '',
        address: '',
        phone: '',
        email: '',
        description: '',
        password: ''
    });
    const [adminFormData, setAdminFormData] = useState<AdminFormData>({
        name: '',
        email: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    // Debug logs
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const addLog = (message: string) => {
        setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    // Form references
    const businessFormRef = useRef<HTMLFormElement>(null);
    const adminFormRef = useRef<HTMLFormElement>(null);

    const fetchBusinesses = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('İşletmeleri getirme işlemi başlatılıyor...');
            console.log('Kullanıcı bilgileri:', user);

            try {
                const response = await businessService.getBusinesses();
                console.log('İşletme verileri alındı:', response);

                // Type guards
                if (Array.isArray(response)) {
                    if (response.length === 0) {
                        console.log('Hiç işletme bulunamadı');
                    }
                    setBusinesses(response);
                    console.log('İşletmeler state\'e atandı (array):', response.length);
                } else if (isBusinessListResponse(response)) {
                    if (response.businesses.length === 0) {
                        console.log('Hiç işletme bulunamadı');
                    }
                    setBusinesses(response.businesses);
                    console.log('İşletmeler state\'e atandı (response):', response.businesses.length);
                } else {
                    console.error('Beklenmeyen veri formatı:', response);
                    setBusinesses([]);
                    setError('İşletmeler yüklenemedi: Geçersiz veri formatı');
                }
            } catch (error: any) {
                console.error('İşletme verilerini çekme hatası:', error);
                if (error.response) {
                    console.error('Sunucu yanıtı:', error.response.status, error.response.data);
                    setError(`İşletme verileri yüklenirken bir hata oluştu: ${error.response.status} - ${error.response.data?.message || 'Bilinmeyen hata'}`);
                } else if (error.request) {
                    console.error('Yanıt alınamadı:', error.request);
                    setError('Sunucudan yanıt alınamadı, internet bağlantınızı kontrol edin.');
                } else {
                    console.error('Hata detayı:', error);
                    setError(`İşletme verileri yüklenirken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`);
                }
                setBusinesses([]);
            }
        } catch (error: any) {
            console.error('Üst düzey hata:', error);
            setError('İşletmeler yüklenirken beklenmeyen bir hata oluştu.');
            setBusinesses([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user || user.role !== UserRole.SUPER_ADMIN) {
            console.error('Bu sayfaya erişim için SUPER_ADMIN yetkisi gereklidir');
            addLog('Yetki hatası: SUPER_ADMIN yetkisi gerekli');
            setError('Bu sayfaya erişim için SUPER_ADMIN yetkisi gereklidir');
            if (!user) {
                // Giriş yapmamış kullanıcıları login sayfasına yönlendir
                window.location.href = '/login';
            }
            return;
        }

        console.log('SUPER_ADMIN yetkisi ile sayfaya erişildi');
        addLog('SUPER_ADMIN olarak giriş yapıldı');
        fetchBusinesses();
    }, [user]);

    const handleOpen = (business?: Business) => {
        setError(null);
        if (business) {
            setSelectedBusiness(business);
            setFormData({
                name: business.name,
                address: business.address,
                phone: business.phone,
                email: business.email,
                description: business.description || '',
                password: ''
            });
        } else {
            setSelectedBusiness(null);
            setFormData({
                name: '',
                address: '',
                phone: '',
                email: '',
                description: '',
                password: ''
            });
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setSelectedBusiness(null);
        setError(null);
        setFormData({
            name: '',
            address: '',
            phone: '',
            email: '',
            description: '',
            password: ''
        });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        // Sayfanın yenilenmesini engelleyelim
        e.preventDefault();

        console.log('Form submit başladı', e.currentTarget);
        addLog('İşletme formu gönderiliyor...');
        setError(null);

        try {
            // Form validasyonu
            if (!formData.name || !formData.address || !formData.phone || !formData.email || (!selectedBusiness && !formData.password)) {
                const errorMsg = 'Lütfen tüm zorunlu alanları doldurun';
                setError(errorMsg);
                addLog(`Validasyon hatası: ${errorMsg}`);
                console.error('Form validasyon hatası: Eksik alanlar', formData);
                return;
            }

            // Email formatı kontrolü
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                const errorMsg = 'Geçerli bir e-posta adresi giriniz';
                setError(errorMsg);
                addLog(`Validasyon hatası: ${errorMsg}`);
                console.error('Form validasyon hatası: Geçersiz email formatı', formData.email);
                return;
            }

            // Telefon formatı kontrolü
            const phoneRegex = /^[0-9]{10,11}$/;
            if (!phoneRegex.test(formData.phone.replace(/\D/g, ''))) {
                const errorMsg = 'Geçerli bir telefon numarası giriniz (10-11 rakam)';
                setError(errorMsg);
                addLog(`Validasyon hatası: ${errorMsg}`);
                console.error('Form validasyon hatası: Geçersiz telefon formatı', formData.phone);
                return;
            }

            // Yeni işletme oluşturulurken şifre kontrolü
            if (!selectedBusiness && formData.password.length < 6) {
                const errorMsg = 'Şifre en az 6 karakter olmalıdır';
                setError(errorMsg);
                addLog(`Validasyon hatası: ${errorMsg}`);
                console.error('Form validasyon hatası: Şifre çok kısa', formData.password.length);
                return;
            }

            setLoading(true);
            addLog('Form validasyonu başarılı, API isteği hazırlanıyor...');

            // Form verilerini hazırla - bu adımda verileri konsola yazdırarak debug edelim
            const submitData = selectedBusiness
                ? { ...formData, password: undefined }
                : formData;

            console.log('Gönderilecek veriler:', {
                ...submitData,
                password: submitData.password ? '***' : undefined
            });
            addLog(`API isteği gönderiliyor: ${selectedBusiness ? 'Güncelleme' : 'Yeni İşletme'}`);

            if (selectedBusiness) {
                // Güncelleme yaparken şifreyi göndermiyoruz
                const { password, ...updateData } = formData;
                addLog(`İşletme güncelleniyor: ${selectedBusiness._id}`);
                try {
                    const updatedBusiness = await businessService.updateBusiness(selectedBusiness._id, updateData);
                    console.log('İşletme güncellendi:', updatedBusiness);
                    addLog('İşletme başarıyla güncellendi');

                    // Önce listeyi yenile, sonra formu kapat
                    await fetchBusinesses();
                    handleClose();
                } catch (updateError: any) {
                    console.error('İşletme güncelleme hatası:', updateError);
                    addLog(`HATA: İşletme güncellenirken bir sorun oluştu - ${updateError.message}`);
                    setError(updateError.message || 'İşletme güncellenirken bir hata oluştu');
                }
            } else {
                // Yeni işletme oluşturma
                addLog('Yeni işletme oluşturuluyor...');
                try {
                    const newBusiness = await businessService.createBusiness(formData);
                    console.log('Yeni işletme oluşturuldu:', newBusiness);
                    addLog('Yeni işletme başarıyla oluşturuldu');

                    // Önce listeyi yenile, sonra formu kapat
                    await fetchBusinesses();
                    handleClose();
                } catch (createError: any) {
                    console.error('İşletme oluşturma hatası:', createError);
                    addLog(`HATA: İşletme oluşturulurken bir sorun oluştu - ${createError.message}`);
                    setError(createError.message || 'İşletme oluşturulurken bir hata oluştu');
                }
            }
        } catch (error: any) {
            console.error('İşletme kaydedilirken hata oluştu:', error);
            const errorMessage = error.response?.data?.message || error.message || 'İşletme kaydedilirken bir hata oluştu';
            addLog(`Hata: ${errorMessage}`);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Bu işletmeyi silmek istediğinizden emin misiniz?')) {
            try {
                await businessService.deleteBusiness(id);
                fetchBusinesses();
            } catch (error) {
                console.error('İşletme silinirken hata oluştu:', error);
            }
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await businessService.approveBusiness(id);
            fetchBusinesses();
        } catch (error) {
            console.error('İşletme onaylanırken hata oluştu:', error);
        }
    };

    const handleAdminDialogOpen = (business: Business) => {
        setSelectedBusiness(business);
        setAdminFormData({
            name: '',
            email: '',
            password: '',
        });
        setError(null);
        setAdminDialogOpen(true);
    };

    const handleAdminDialogClose = () => {
        setAdminDialogOpen(false);
        setSelectedBusiness(null);
        setError(null);
        setAdminFormData({
            name: '',
            email: '',
            password: '',
        });
    };

    const handleAdminSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        // Sayfanın yenilenmesini engelleyelim
        e.preventDefault();

        setError(null);

        if (!selectedBusiness) {
            setError('İşletme seçilmedi');
            return;
        }

        // Form validasyonu
        if (!adminFormData.name || !adminFormData.email || !adminFormData.password) {
            setError('Lütfen tüm zorunlu alanları doldurun');
            console.error('Admin form validasyon hatası: Eksik alanlar', adminFormData);
            return;
        }

        // Email formatı kontrolü
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(adminFormData.email)) {
            setError('Geçerli bir e-posta adresi giriniz');
            console.error('Admin form validasyon hatası: Geçersiz email formatı', adminFormData.email);
            return;
        }

        // Şifre uzunluğu kontrolü
        if (adminFormData.password.length < 6) {
            setError('Şifre en az 6 karakter olmalıdır');
            console.error('Admin form validasyon hatası: Şifre çok kısa', adminFormData.password.length);
            return;
        }

        try {
            setLoading(true);
            console.log('Admin ekleme isteği gönderiliyor:', {
                businessId: selectedBusiness._id,
                adminData: { ...adminFormData, password: '***' }
            });

            await businessService.addBusinessAdmin(selectedBusiness._id, adminFormData);
            console.log('Admin başarıyla eklendi');

            handleAdminDialogClose();
            // Başarı mesajı göster
            setError(null);
        } catch (error: any) {
            console.error('Admin eklenirken hata:', error);
            if (error.response?.data) {
                console.error('Sunucu yanıtı:', error.response.data);
                setError(error.response.data.message || 'Admin eklenirken bir hata oluştu');
            } else {
                setError(error.message || 'Admin eklenirken bir hata oluştu');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    İşletmeler
                </Typography>
                {user?.role === UserRole.SUPER_ADMIN && (
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpen()}
                        disabled={loading}
                    >
                        Yeni İşletme
                    </Button>
                )}
            </Box>

            {loading ? (
                <Box display="flex" justifyContent="center" my={4}>
                    <CircularProgress />
                </Box>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>İşletme Adı</TableCell>
                                <TableCell>E-posta</TableCell>
                                <TableCell>Telefon</TableCell>
                                <TableCell>Durum</TableCell>
                                <TableCell>Oluşturulma Tarihi</TableCell>
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
                                        <Chip
                                            label={business.isApproved ? 'Onaylı' : 'Onay Bekliyor'}
                                            color={business.isApproved ? 'success' : 'warning'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>{formatDate(business.createdAt)}</TableCell>
                                    <TableCell>
                                        {user?.role === UserRole.SUPER_ADMIN && (
                                            <>
                                                <IconButton
                                                    color="primary"
                                                    onClick={() => handleOpen(business)}
                                                    disabled={loading}
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton
                                                    color="error"
                                                    onClick={() => handleDelete(business._id)}
                                                    disabled={loading}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                                {!business.isApproved && (
                                                    <IconButton
                                                        color="success"
                                                        onClick={() => handleApprove(business._id)}
                                                        disabled={loading}
                                                    >
                                                        <CheckCircleIcon />
                                                    </IconButton>
                                                )}
                                                <IconButton
                                                    color="primary"
                                                    onClick={() => handleAdminDialogOpen(business)}
                                                    disabled={loading}
                                                >
                                                    <PersonAddIcon />
                                                </IconButton>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* İşletme Ekleme/Düzenleme Dialog'u */}
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {selectedBusiness ? 'İşletme Düzenle' : 'Yeni İşletme Ekle'}
                </DialogTitle>
                <DialogContent>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
                            {error}
                        </Alert>
                    )}
                    <form
                        id="business-form"
                        onSubmit={handleSubmit}
                        noValidate
                    >
                        <TextField
                            margin="dense"
                            label="İşletme Adı"
                            name="name"
                            type="text"
                            fullWidth
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            error={!formData.name}
                            helperText={!formData.name ? "İşletme adı zorunludur" : ""}
                            autoFocus
                        />
                        <TextField
                            margin="dense"
                            label="Adres"
                            name="address"
                            type="text"
                            fullWidth
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            required
                            error={!formData.address}
                            helperText={!formData.address ? "Adres zorunludur" : ""}
                        />
                        <TextField
                            margin="dense"
                            label="Telefon"
                            name="phone"
                            type="tel"
                            fullWidth
                            value={formData.phone}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                if (value.length <= 11) {
                                    setFormData({ ...formData, phone: value });
                                }
                            }}
                            required
                            error={!formData.phone || !/^[0-9]{10,11}$/.test(formData.phone.replace(/\D/g, ''))}
                            helperText={!formData.phone ? "Telefon zorunludur" : !/^[0-9]{10,11}$/.test(formData.phone.replace(/\D/g, '')) ? "Geçerli bir telefon numarası giriniz (10-11 rakam)" : ""}
                            inputProps={{ maxLength: 11 }}
                        />
                        <TextField
                            margin="dense"
                            label="E-posta"
                            name="email"
                            type="email"
                            fullWidth
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            error={!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)}
                            helperText={!formData.email ? "E-posta zorunludur" : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? "Geçerli bir e-posta adresi giriniz" : ""}
                        />
                        <TextField
                            margin="dense"
                            label="Açıklama"
                            name="description"
                            type="text"
                            fullWidth
                            multiline
                            rows={4}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                        {!selectedBusiness && (
                            <TextField
                                margin="dense"
                                label="Şifre"
                                name="password"
                                type="password"
                                fullWidth
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                error={!formData.password || formData.password.length < 6}
                                helperText={!formData.password ? "Şifre zorunludur" : formData.password.length < 6 ? "Şifre en az 6 karakter olmalıdır" : ""}
                            />
                        )}
                    </form>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} disabled={loading}>
                        İptal
                    </Button>
                    <Button
                        type="submit"
                        form="business-form"
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : selectedBusiness ? 'Güncelle' : 'Kaydet'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Admin Ekleme Dialog'u */}
            <Dialog
                open={adminDialogOpen}
                onClose={handleAdminDialogClose}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    İşletme Yöneticisi Ekle
                </DialogTitle>
                <DialogContent>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
                            {error}
                        </Alert>
                    )}
                    <form
                        id="admin-form"
                        onSubmit={handleAdminSubmit}
                        noValidate
                    >
                        <TextField
                            margin="dense"
                            label="Yönetici Adı"
                            name="name"
                            type="text"
                            fullWidth
                            value={adminFormData.name}
                            onChange={(e) => setAdminFormData({ ...adminFormData, name: e.target.value })}
                            required
                            error={!adminFormData.name}
                            helperText={!adminFormData.name ? "Yönetici adı zorunludur" : ""}
                            autoFocus
                        />
                        <TextField
                            margin="dense"
                            label="E-posta"
                            name="email"
                            type="email"
                            fullWidth
                            value={adminFormData.email}
                            onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                            required
                            error={!adminFormData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminFormData.email)}
                            helperText={!adminFormData.email ? "E-posta zorunludur" : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminFormData.email) ? "Geçerli bir e-posta adresi giriniz" : ""}
                        />
                        <TextField
                            margin="dense"
                            label="Şifre"
                            name="password"
                            type="password"
                            fullWidth
                            value={adminFormData.password}
                            onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                            required
                            error={!adminFormData.password || adminFormData.password.length < 6}
                            helperText={!adminFormData.password ? "Şifre zorunludur" : adminFormData.password.length < 6 ? "Şifre en az 6 karakter olmalıdır" : ""}
                        />
                    </form>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleAdminDialogClose} disabled={loading}>
                        İptal
                    </Button>
                    <Button
                        type="submit"
                        form="admin-form"
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Ekle'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Debug Panel */}
            <DebugPanel logs={debugLogs} />
        </Container>
    );
};

export default Businesses; 