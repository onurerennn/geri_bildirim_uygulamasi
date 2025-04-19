import React, { useState } from 'react';
import {
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    Stack,
    Box,
    Avatar,
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';

const Profile: React.FC = () => {
    const [formData, setFormData] = useState({
        name: 'John Doe',
        email: 'john@example.com',
        company: 'ABC Company',
        phone: '+90 555 123 4567',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleProfileUpdate = (event: React.FormEvent) => {
        event.preventDefault();
        // TODO: Implement profile update logic
        console.log('Profile update:', formData);
    };

    const handlePasswordUpdate = (event: React.FormEvent) => {
        event.preventDefault();
        // TODO: Implement password update logic
        console.log('Password update:', {
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword,
            confirmPassword: formData.confirmPassword,
        });
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Stack spacing={3}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Profil
                </Typography>

                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Profil Bilgileri
                    </Typography>
                    <form onSubmit={handleProfileUpdate}>
                        <Stack spacing={2}>
                            <TextField
                                fullWidth
                                label="Ad Soyad"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                            />
                            <TextField
                                fullWidth
                                label="E-posta"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                            <TextField
                                fullWidth
                                label="Şirket"
                                name="company"
                                value={formData.company}
                                onChange={handleChange}
                            />
                            <TextField
                                fullWidth
                                label="Telefon"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                            />
                            <Box>
                                <Button type="submit" variant="contained">
                                    Güncelle
                                </Button>
                            </Box>
                        </Stack>
                    </form>
                </Paper>

                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Şifre Değiştir
                    </Typography>
                    <form onSubmit={handlePasswordUpdate}>
                        <Stack spacing={2}>
                            <TextField
                                fullWidth
                                label="Mevcut Şifre"
                                name="currentPassword"
                                type="password"
                                value={formData.currentPassword}
                                onChange={handleChange}
                            />
                            <TextField
                                fullWidth
                                label="Yeni Şifre"
                                name="newPassword"
                                type="password"
                                value={formData.newPassword}
                                onChange={handleChange}
                            />
                            <TextField
                                fullWidth
                                label="Yeni Şifre Tekrar"
                                name="confirmPassword"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                            />
                            <Box>
                                <Button type="submit" variant="contained">
                                    Şifreyi Değiştir
                                </Button>
                            </Box>
                        </Stack>
                    </form>
                </Paper>
            </Stack>
        </Container>
    );
};

export default Profile; 