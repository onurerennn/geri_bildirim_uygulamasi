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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Stack,
    IconButton,
    Chip,
    Box,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import userService, { User, CreateUserData, UpdateUserData } from '../services/userService';
import { UserRole } from '../types/UserRole';

const Users: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [open, setOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<CreateUserData | UpdateUserData>({
        name: '',
        email: '',
        password: '',
        role: UserRole.CUSTOMER,
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const data = await userService.getUsers();
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleOpen = (user?: User) => {
        if (user) {
            setSelectedUser(user);
            setFormData({
                name: user.name,
                email: user.email,
                role: user.role,
            });
        } else {
            setSelectedUser(null);
            setFormData({
                name: '',
                email: '',
                password: '',
                role: UserRole.CUSTOMER,
            });
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setSelectedUser(null);
        setFormData({
            name: '',
            email: '',
            password: '',
            role: UserRole.CUSTOMER,
        });
    };

    const handleSubmit = async () => {
        try {
            if (selectedUser) {
                await userService.updateUser(selectedUser._id, formData);
            } else {
                await userService.createUser(formData as CreateUserData);
            }
            fetchUsers();
            handleClose();
        } catch (error) {
            console.error('Error saving user:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await userService.deleteUser(id);
                fetchUsers();
            } catch (error) {
                console.error('Error deleting user:', error);
            }
        }
    };

    const getRoleColor = (role: UserRole) => {
        switch (role) {
            case UserRole.SUPER_ADMIN:
                return '#f44336';
            case UserRole.BUSINESS_ADMIN:
                return '#2196f3';
            case UserRole.CUSTOMER:
                return '#4caf50';
            default:
                return 'inherit';
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    Kullanıcı Yönetimi
                </Typography>
                <Button variant="contained" color="primary" onClick={() => handleOpen()}>
                    Yeni Kullanıcı
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
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
                                    <Box
                                        sx={{
                                            color: getRoleColor(user.role),
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        {user.role}
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Box
                                        sx={{
                                            color: user.isActive ? '#4caf50' : '#f44336',
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        {user.isActive ? 'Aktif' : 'Pasif'}
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleOpen(user)}
                                        color="primary"
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleDelete(user._id)}
                                        color="error"
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}
                </DialogTitle>
                <form onSubmit={handleSubmit}>
                    <DialogContent>
                        <Stack spacing={2}>
                            <TextField
                                fullWidth
                                label="Ad Soyad"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                required
                            />
                            <TextField
                                fullWidth
                                label="E-posta"
                                type="email"
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                                required
                            />
                            {!selectedUser && (
                                <TextField
                                    fullWidth
                                    label="Şifre"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData({ ...formData, password: e.target.value })
                                    }
                                    required
                                />
                            )}
                            <FormControl fullWidth>
                                <InputLabel>Rol</InputLabel>
                                <Select
                                    value={formData.role}
                                    label="Rol"
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            role: e.target.value as UserRole,
                                        })
                                    }
                                >
                                    <MenuItem value={UserRole.SUPER_ADMIN}>Süper Admin</MenuItem>
                                    <MenuItem value={UserRole.BUSINESS_ADMIN}>İşletme Admin</MenuItem>
                                    <MenuItem value={UserRole.CUSTOMER}>Müşteri</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose}>İptal</Button>
                        <Button type="submit" variant="contained" color="primary">
                            Kaydet
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Container>
    );
};

export default Users; 