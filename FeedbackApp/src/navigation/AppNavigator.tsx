import React from 'react';
// @ts-ignore
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import MainNavigator from './MainNavigator';
import { useAuthContext } from '../context/AuthContext';
// @ts-ignore
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import BusinessDashboardScreen from '../screens/BusinessDashboardScreen';
import CreateSurveyScreen from '../screens/CreateSurveyScreen';
import QRCodeScreen from '../screens/QRCodeScreen';

// Ana uygulama navigasyonu
const Stack = createStackNavigator();

const AppNavigator = () => {
    // Auth context'ten kimlik doğrulama durumunu al
    const { isLoading, isAuthenticated } = useAuthContext();

    // Uygulama yüklenirken loading ekranı göster
    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#3498db" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            {isAuthenticated ? (
                // Giriş yapmış kullanıcı
                <MainNavigator />
            ) : (
                // Giriş yapmamış kullanıcı
                <Stack.Navigator
                    initialRouteName="Login"
                    screenOptions={{
                        headerShown: false
                    }}
                >
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                </Stack.Navigator>
            )}
        </NavigationContainer>
    );
};

export default AppNavigator; 