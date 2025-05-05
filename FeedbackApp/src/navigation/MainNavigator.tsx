import React from 'react';
// @ts-ignore
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../context/AuthContext';
import { UserRole } from '../types/UserRole';
// @ts-ignore
import { createStackNavigator } from '@react-navigation/stack';
// @ts-ignore
import { RouteProp, ParamListBase } from '@react-navigation/native';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SurveyListScreen from '../screens/SurveyListScreen';
import BusinessScreen from '../screens/BusinessScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import BusinessDashboardScreen from '../screens/BusinessDashboardScreen';
import UsersScreen from '../screens/UsersScreen';
import CreateSurveyScreen from '../screens/CreateSurveyScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import QRCodeScreen from '../screens/QRCodeScreen';
import ScanQRScreen from '../screens/ScanQRScreen';
import SurveyFormScreen from '../screens/SurveyFormScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Icon props için interface tanımla
interface TabBarIconProps {
    focused: boolean;
    color: string;
    size: number;
}

// Admin için tab navigator
const AdminNavigator = () => (
    <Tab.Navigator
        screenOptions={({ route }: { route: RouteProp<ParamListBase, string> }) => ({
            tabBarIcon: ({ focused, color, size }: TabBarIconProps) => {
                let iconName: any;

                if (route.name === 'Dashboard') {
                    iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                } else if (route.name === 'Users') {
                    iconName = focused ? 'people' : 'people-outline';
                } else if (route.name === 'AdminProfile') {
                    iconName = focused ? 'person' : 'person-outline';
                }

                return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#3498db',
            tabBarInactiveTintColor: 'gray',
            headerShown: true,
        })}
    >
        <Tab.Screen
            name="Dashboard"
            component={AdminDashboardScreen}
            options={{ title: 'Gösterge Paneli' }}
        />
        <Tab.Screen
            name="Users"
            component={UsersScreen}
            options={{ title: 'Kullanıcılar' }}
        />
        <Tab.Screen
            name="AdminProfile"
            component={ProfileScreen}
            options={{ title: 'Profil' }}
        />
    </Tab.Navigator>
);

// İşletme admin için tab navigator
const BusinessAdminNavigator = () => (
    <Tab.Navigator
        screenOptions={({ route }: { route: RouteProp<ParamListBase, string> }) => ({
            tabBarIcon: ({ focused, color, size }: TabBarIconProps) => {
                let iconName: any;

                if (route.name === 'BusinessDashboard') {
                    iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                } else if (route.name === 'Surveys') {
                    iconName = focused ? 'document-text' : 'document-text-outline';
                }

                return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#3498db',
            tabBarInactiveTintColor: 'gray',
            headerShown: true,
        })}
    >
        <Tab.Screen
            name="BusinessDashboard"
            component={BusinessDashboardScreen}
            options={{ title: 'İşletme Paneli' }}
        />
        <Tab.Screen
            name="Surveys"
            component={SurveyListScreen}
            options={{ title: 'Anketler' }}
        />
    </Tab.Navigator>
);

// Müşteri için tab navigator
const CustomerNavigator = () => (
    <Tab.Navigator
        screenOptions={({ route }: { route: RouteProp<ParamListBase, string> }) => ({
            tabBarIcon: ({ focused, color, size }: TabBarIconProps) => {
                let iconName: any;

                if (route.name === 'Home') {
                    iconName = focused ? 'home' : 'home-outline';
                } else if (route.name === 'ScanQR') {
                    iconName = focused ? 'qr-code' : 'qr-code-outline';
                } else if (route.name === 'Surveys') {
                    iconName = focused ? 'document-text' : 'document-text-outline';
                } else if (route.name === 'CustomerProfile') {
                    iconName = focused ? 'person' : 'person-outline';
                }

                return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#3498db',
            tabBarInactiveTintColor: 'gray',
            headerShown: true,
        })}
    >
        <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Ana Sayfa' }}
        />
        <Tab.Screen
            name="ScanQR"
            component={ScanQRScreen}
            options={{ title: 'QR Kod Tara' }}
        />
        <Tab.Screen
            name="Surveys"
            component={SurveyListScreen}
            options={{ title: 'Anketler' }}
        />
        <Tab.Screen
            name="CustomerProfile"
            component={ProfileScreen}
            options={{ title: 'Profil' }}
        />
    </Tab.Navigator>
);

// Her bir rol için ayrı Stack Navigator oluşturuyoruz
const AdminStack = createStackNavigator();
const AdminStackNavigator = () => (
    <AdminStack.Navigator
        screenOptions={{
            headerShown: false
        }}
    >
        <AdminStack.Screen name="AdminTabs" component={AdminNavigator} />
        <AdminStack.Screen name="CreateSurvey" component={CreateSurveyScreen} options={{ headerShown: true, title: 'Anket Oluştur' }} />
        <AdminStack.Screen name="BusinessScreen" component={BusinessScreen} options={{
            headerShown: true,
            title: 'İşletme Yönetimi',
            headerBackTitle: 'Geri',
        }} />
    </AdminStack.Navigator>
);

const BusinessAdminStack = createStackNavigator();
const BusinessAdminStackNavigator = () => (
    <BusinessAdminStack.Navigator
        screenOptions={{
            headerShown: false
        }}
    >
        <BusinessAdminStack.Screen name="BusinessAdminTabs" component={BusinessAdminNavigator} />
        <BusinessAdminStack.Screen name="CreateSurvey" component={CreateSurveyScreen} options={{ headerShown: true, title: 'Anket Oluştur' }} />
        <BusinessAdminStack.Screen name="QRCodeScreen" component={QRCodeScreen} options={{ headerShown: true, title: 'QR Kod Yönetimi' }} />
    </BusinessAdminStack.Navigator>
);

const CustomerStack = createStackNavigator();
const CustomerStackNavigator = () => (
    <CustomerStack.Navigator
        screenOptions={{
            headerShown: false
        }}
    >
        <CustomerStack.Screen name="CustomerTabs" component={CustomerNavigator} />
        <CustomerStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
    </CustomerStack.Navigator>
);

// Giriş ve kayıt ekranları için navigator
const AuthStack = createStackNavigator();
const AuthStackNavigator = () => (
    <AuthStack.Navigator
        initialRouteName="Login"
        screenOptions={{
            headerShown: false,
        }}
    >
        <AuthStack.Screen name="Login" component={LoginScreen} />
        <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
);

const MainNavigator = () => {
    const { user, isAuthenticated } = useAuthContext();

    // Eğer kullanıcı oturum açmamışsa, giriş ekranlarını göster
    if (!isAuthenticated) {
        return <AuthStackNavigator />;
    }

    // Kullanıcı rolüne göre doğru navigatör seçilir
    if (user?.role === UserRole.SUPER_ADMIN) {
        return <AdminStackNavigator />;
    } else if (user?.role === UserRole.BUSINESS_ADMIN) {
        return <BusinessAdminStackNavigator />;
    } else {
        return <CustomerStackNavigator />;
    }
};

export default MainNavigator; 