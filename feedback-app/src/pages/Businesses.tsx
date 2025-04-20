import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import businessService, { Business, CreateBusinessData, UpdateBusinessData } from '../services/businessService';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/UserRole';
import { formatDate } from '../utils/dateUtils';

interface BusinessFormData extends CreateBusinessData { }

const Businesses = () => {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [open, setOpen] = useState(false);
    const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
    const [formData, setFormData] = useState<BusinessFormData>({
        name: '',
        address: '',
        phone: '',
        email: '',
        description: '',
    });
    const { user } = useAuth();

    const fetchBusinesses = async () => {
        try {
            const data = await businessService.getBusinesses();
            setBusinesses(data);
        } catch (error) {
            console.error('İşletmeler yüklenirken hata oluştu:', error);
        }
    };

    useEffect(() => {
        fetchBusinesses();
    }, []);

    const handleOpen = (business?: Business) => {
        if (business) {
            setSelectedBusiness(business);
            setFormData({
                name: business.name,
                address: business.address,
                phone: business.phone,
                email: business.email,
                description: business.description,
            });
        } else {
            setSelectedBusiness(null);
            setFormData({
                name: '',
                address: '',
                phone: '',
                email: '',
                description: '',
            });
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setSelectedBusiness(null);
        setFormData({
            name: '',
            address: '',
            phone: '',
            email: '',
            description: '',
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (selectedBusiness) {
                await businessService.updateBusiness(selectedBusiness._id, formData);
            } else {
                await businessService.createBusiness(formData);
            }
            handleClose();
            fetchBusinesses();
        } catch (error) {
            console.error('İşletme kaydedilirken hata oluştu:', error);
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

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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
                    >
                        Yeni İşletme
                    </Button>
                )}
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>İşletme Adı</TableCell>
                            <TableCell>E-posta</TableCell>
                            <TableCell>Telefon</TableCell>
                            <TableCell>Durum</TableCell>
                            <TableCell>Onay Durumu</TableCell>
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
                                    <Chip
                                        label={business.isActive ? 'Aktif' : 'Pasif'}
                                        color={business.isActive ? 'success' : 'default'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={business.isApproved ? 'Onaylı' : 'Beklemede'}
                                        color={business.isApproved ? 'primary' : 'warning'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>{formatDate(business.createdAt)}</TableCell>
                                <TableCell>
                                    {user?.role === UserRole.SUPER_ADMIN && (
                                        <>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleOpen(business)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDelete(business._id)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                            {!business.isApproved && (
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleApprove(business._id)}
                                                >
                                                    <CheckCircleIcon />
                                                </IconButton>
                                            )}
                                        </>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
                <DialogTitle>
                    {selectedBusiness ? 'İşletme Düzenle' : 'Yeni İşletme'}
                </DialogTitle>
                <form onSubmit={handleSubmit}>
                    <DialogContent>
                        <TextField
                            fullWidth
                            label="İşletme Adı"
                            value={formData.name}
                            onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })
                            }
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Adres"
                            value={formData.address}
                            onChange={(e) =>
                                setFormData({ ...formData, address: e.target.value })
                            }
                            margin="normal"
                            required
                            multiline
                            rows={3}
                        />
                        <TextField
                            fullWidth
                            label="Telefon"
                            value={formData.phone}
                            onChange={(e) =>
                                setFormData({ ...formData, phone: e.target.value })
                            }
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="E-posta"
                            value={formData.email}
                            onChange={(e) =>
                                setFormData({ ...formData, email: e.target.value })
                            }
                            margin="normal"
                            required
                            type="email"
                        />
                        <TextField
                            fullWidth
                            label="Açıklama"
                            value={formData.description}
                            onChange={(e) =>
                                setFormData({ ...formData, description: e.target.value })
                            }
                            margin="normal"
                            required
                            multiline
                            rows={4}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>İptal</Button>
                        <Button type="submit" variant="contained" color="primary">
                            {selectedBusiness ? 'Güncelle' : 'Oluştur'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Container>
    );
};

export default Businesses; 