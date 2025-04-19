import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Typography,
    Box,
    Chip,
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    CheckCircle as ApproveIcon,
} from '@mui/icons-material';
import businessService, {
    Business,
    CreateBusinessData,
    UpdateBusinessData,
} from '../services/businessService';

const Businesses = () => {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [open, setOpen] = useState(false);
    const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
    const [formData, setFormData] = useState<CreateBusinessData | UpdateBusinessData>({
        name: '',
        address: '',
        phone: '',
        email: '',
        description: '',
    });

    useEffect(() => {
        fetchBusinesses();
    }, []);

    const fetchBusinesses = async () => {
        try {
            const data = await businessService.getBusinesses();
            setBusinesses(data);
        } catch (error) {
            console.error('Error fetching businesses:', error);
        }
    };

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

    const handleSubmit = async () => {
        try {
            if (selectedBusiness) {
                await businessService.updateBusiness(selectedBusiness._id, formData);
            } else {
                await businessService.createBusiness(formData as CreateBusinessData);
            }
            fetchBusinesses();
            handleClose();
        } catch (error) {
            console.error('Error saving business:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this business?')) {
            try {
                await businessService.deleteBusiness(id);
                fetchBusinesses();
            } catch (error) {
                console.error('Error deleting business:', error);
            }
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await businessService.approveBusiness(id);
            fetchBusinesses();
        } catch (error) {
            console.error('Error approving business:', error);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">Businesses</Typography>
                <Button variant="contained" color="primary" onClick={() => handleOpen()}>
                    Add Business
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Phone</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Approved By</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {businesses.map((business) => (
                            <TableRow key={business._id}>
                                <TableCell>{business.name}</TableCell>
                                <TableCell>{business.email}</TableCell>
                                <TableCell>{business.phone}</TableCell>
                                <TableCell>
                                    <Box display="flex" gap={1}>
                                        <Chip
                                            label={business.isApproved ? 'Approved' : 'Pending'}
                                            color={business.isApproved ? 'success' : 'warning'}
                                            size="small"
                                        />
                                        <Chip
                                            label={business.isActive ? 'Active' : 'Inactive'}
                                            color={business.isActive ? 'primary' : 'default'}
                                            size="small"
                                        />
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    {business.approvedBy ? business.approvedBy.name : '-'}
                                </TableCell>
                                <TableCell>
                                    <IconButton onClick={() => handleOpen(business)} color="primary">
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton onClick={() => handleDelete(business._id)} color="error">
                                        <DeleteIcon />
                                    </IconButton>
                                    {!business.isApproved && (
                                        <IconButton
                                            onClick={() => handleApprove(business._id)}
                                            color="success"
                                        >
                                            <ApproveIcon />
                                        </IconButton>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>
                    {selectedBusiness ? 'Edit Business' : 'Add Business'}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        margin="dense"
                        label="Name"
                        fullWidth
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="Address"
                        fullWidth
                        multiline
                        rows={2}
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="Phone"
                        fullWidth
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="Email"
                        type="email"
                        fullWidth
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <TextField
                        margin="dense"
                        label="Description"
                        fullWidth
                        multiline
                        rows={3}
                        value={formData.description}
                        onChange={(e) =>
                            setFormData({ ...formData, description: e.target.value })
                        }
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained" color="primary">
                        {selectedBusiness ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default Businesses; 