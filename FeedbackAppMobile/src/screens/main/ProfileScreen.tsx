import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, Card, Avatar, Button, TextInput, List, Switch, Dialog, Portal, useTheme } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const ProfileScreen = ({ navigation }: any) => {
    const { user, logout, updateUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isNotificationEnabled, setIsNotificationEnabled] = useState(true);
    const [isLogoutDialogVisible, setIsLogoutDialogVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const theme = useTheme();

    const handleEditProfile = () => {
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setName(user?.name || '');
        setEmail(user?.email || '');
        setIsEditing(false);
    };

    const handleSaveProfile = async () => {
        if (!name.trim()) {
            Alert.alert('Hata', 'İsim alanı boş olamaz.');
            return;
        }

        if (!email.trim() || !email.includes('@')) {
            Alert.alert('Hata', 'Geçerli bir e-posta adresi girin.');
            return;
        }

        try {
            setIsLoading(true);
            const response = await api.put('/users/profile', {
                name,
                email
            });

            if (response.data.success) {
                // Kullanıcı context'ini güncelle
                await updateUser({
                    ...user!,
                    name,
                    email
                });

                setIsEditing(false);
                Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi.');
            }
        } catch (error) {
            console.error('Profil güncelleme hatası:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword) {
            Alert.alert('Hata', 'Mevcut şifrenizi girmelisiniz.');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Hata', 'Yeni şifre en az 6 karakter olmalıdır.');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Hata', 'Yeni şifre ve onay şifresi eşleşmiyor.');
            return;
        }

        try {
            setIsLoading(true);
            const response = await api.put('/users/change-password', {
                currentPassword,
                newPassword
            });

            if (response.data.success) {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setIsChangingPassword(false);
                Alert.alert('Başarılı', 'Şifreniz başarıyla değiştirildi.');
            }
        } catch (error) {
            console.error('Şifre değiştirme hatası:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        setIsLogoutDialogVisible(false);
        await logout();
    };

    return (
        <ScrollView style={styles.container}>
            <Card style={styles.profileCard}>
                <Card.Content style={styles.profileContent}>
                    <Avatar.Text
                        size={80}
                        label={user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        style={{ backgroundColor: theme.colors.primary }}
                    />
                    <View style={styles.profileInfo}>
                        {isEditing ? (
                            <>
                                <TextInput
                                    label="İsim"
                                    value={name}
                                    onChangeText={setName}
                                    mode="outlined"
                                    style={styles.input}
                                />
                                <TextInput
                                    label="E-posta"
                                    value={email}
                                    onChangeText={setEmail}
                                    mode="outlined"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    style={styles.input}
                                />
                                <View style={styles.editButtonsContainer}>
                                    <Button
                                        mode="outlined"
                                        onPress={handleCancelEdit}
                                        style={styles.editButton}
                                        disabled={isLoading}
                                    >
                                        İptal
                                    </Button>
                                    <Button
                                        mode="contained"
                                        onPress={handleSaveProfile}
                                        style={styles.editButton}
                                        loading={isLoading}
                                        disabled={isLoading}
                                    >
                                        Kaydet
                                    </Button>
                                </View>
                            </>
                        ) : (
                            <>
                                <Text style={styles.name}>{user?.name}</Text>
                                <Text style={styles.email}>{user?.email}</Text>
                                <Text style={styles.role}>
                                    {user?.role === 'BUSINESS_ADMIN' ? 'İşletme Yöneticisi' : 'Müşteri'}
                                </Text>
                                <Button
                                    mode="contained"
                                    onPress={handleEditProfile}
                                    style={styles.editProfileButton}
                                >
                                    Profili Düzenle
                                </Button>
                            </>
                        )}
                    </View>
                </Card.Content>
            </Card>

            <Card style={styles.settingsCard}>
                <Card.Content>
                    <List.Section>
                        <List.Subheader>Güvenlik</List.Subheader>
                        <List.Item
                            title="Şifre Değiştir"
                            left={(props) => <List.Icon {...props} icon="lock" />}
                            onPress={() => setIsChangingPassword(!isChangingPassword)}
                        />
                        {isChangingPassword && (
                            <View style={styles.passwordSection}>
                                <TextInput
                                    label="Mevcut Şifre"
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                    secureTextEntry
                                    mode="outlined"
                                    style={styles.input}
                                />
                                <TextInput
                                    label="Yeni Şifre"
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry
                                    mode="outlined"
                                    style={styles.input}
                                />
                                <TextInput
                                    label="Yeni Şifre (Tekrar)"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry
                                    mode="outlined"
                                    style={styles.input}
                                />
                                <View style={styles.editButtonsContainer}>
                                    <Button
                                        mode="outlined"
                                        onPress={() => setIsChangingPassword(false)}
                                        style={styles.editButton}
                                        disabled={isLoading}
                                    >
                                        İptal
                                    </Button>
                                    <Button
                                        mode="contained"
                                        onPress={handleChangePassword}
                                        style={styles.editButton}
                                        loading={isLoading}
                                        disabled={isLoading}
                                    >
                                        Şifreyi Değiştir
                                    </Button>
                                </View>
                            </View>
                        )}

                        <List.Subheader>Bildirimler</List.Subheader>
                        <List.Item
                            title="Bildirimler"
                            description="Anket ve ödül bildirimleri"
                            left={(props) => <List.Icon {...props} icon="bell" />}
                            right={(props) => (
                                <Switch
                                    value={isNotificationEnabled}
                                    onValueChange={setIsNotificationEnabled}
                                    color={theme.colors.primary}
                                />
                            )}
                        />

                        <List.Subheader>Hesap</List.Subheader>
                        <List.Item
                            title="Çıkış Yap"
                            titleStyle={{ color: theme.colors.error }}
                            left={(props) => <List.Icon {...props} icon="logout" color={theme.colors.error} />}
                            onPress={() => setIsLogoutDialogVisible(true)}
                        />
                    </List.Section>
                </Card.Content>
            </Card>

            <Portal>
                <Dialog
                    visible={isLogoutDialogVisible}
                    onDismiss={() => setIsLogoutDialogVisible(false)}
                >
                    <Dialog.Title>Çıkış Yap</Dialog.Title>
                    <Dialog.Content>
                        <Text>Hesabınızdan çıkış yapmak istediğinize emin misiniz?</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setIsLogoutDialogVisible(false)}>İptal</Button>
                        <Button onPress={handleLogout}>Çıkış Yap</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    profileCard: {
        margin: 16,
        marginBottom: 8,
        elevation: 2,
    },
    profileContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileInfo: {
        marginLeft: 20,
        flex: 1,
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    email: {
        fontSize: 14,
        marginTop: 4,
        color: '#666',
    },
    role: {
        fontSize: 14,
        marginTop: 4,
        backgroundColor: '#e8f4f8',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        color: '#0077b6',
    },
    editProfileButton: {
        marginTop: 12,
        alignSelf: 'flex-start',
    },
    settingsCard: {
        margin: 16,
        marginTop: 8,
        elevation: 2,
    },
    input: {
        marginBottom: 12,
    },
    editButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    editButton: {
        flex: 1,
        marginHorizontal: 4,
    },
    passwordSection: {
        backgroundColor: '#f9f9f9',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 16,
    },
});

export default ProfileScreen; 