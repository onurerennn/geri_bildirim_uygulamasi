import React from 'react';
import {
    AppBar,
    Box,
    CssBaseline,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemButton,
    Toolbar,
    Typography,
    useTheme,
    Button,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    People as PeopleIcon,
    Business as BusinessIcon,
    Assessment as AssessmentIcon,
    QrCode as QrCodeIcon,
    Person as PersonIcon,
    Logout as LogoutIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/UserRole';

const drawerWidth = 240;

interface Props {
    children: React.ReactNode;
}

const Layout: React.FC<Props> = ({ children }) => {
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const theme = useTheme();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getMenuItems = () => {
        const items = [
            { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
        ];

        // Süper Admin ve İşletme Admin'e özel menü öğeleri
        if (user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.BUSINESS_ADMIN) {
            items.push(
                { text: 'Kullanıcılar', icon: <PeopleIcon />, path: '/users' },
                { text: 'İşletmeler', icon: <BusinessIcon />, path: '/businesses' }
            );
        }

        items.push(
            { text: 'Anketler', icon: <AssessmentIcon />, path: '/surveys' },
            { text: 'QR Kodlar', icon: <QrCodeIcon />, path: '/qr-codes' },
            { text: 'Profil', icon: <PersonIcon />, path: '/profile' }
        );

        return items;
    };

    const drawer = (
        <div>
            <Toolbar />
            <List>
                {getMenuItems().map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton onClick={() => navigate(item.path)}>
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
                <ListItem disablePadding>
                    <ListItemButton onClick={handleLogout}>
                        <ListItemIcon><LogoutIcon /></ListItemIcon>
                        <ListItemText primary="Çıkış Yap" />
                    </ListItemButton>
                </ListItem>
            </List>
        </div>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            <AppBar
                position="fixed"
                sx={{
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    ml: { sm: `${drawerWidth}px` },
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { sm: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                        Geri Bildirim Uygulaması
                    </Typography>
                    <Typography variant="subtitle1" sx={{ mr: 2 }}>
                        {user?.name}
                    </Typography>
                </Toolbar>
            </AppBar>
            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true,
                    }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: drawerWidth,
                        },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': {
                            boxSizing: 'border-box',
                            width: drawerWidth,
                        },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                }}
            >
                <Toolbar />
                {children}
            </Box>
        </Box>
    );
};

export default Layout; 