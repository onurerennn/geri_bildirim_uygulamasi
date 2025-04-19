import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import DashboardScreen from '../screens/main/DashboardScreen';
import UsersScreen from '../screens/main/UsersScreen';
import UserFormScreen from '../screens/main/UserFormScreen';
import BusinessesScreen from '../screens/main/BusinessesScreen';
import BusinessFormScreen from '../screens/main/BusinessFormScreen';
import SurveysScreen from '../screens/main/SurveysScreen';
import QRCodesScreen from '../screens/main/QRCodesScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import { MainStackParamList } from '../types/navigation';

const Stack = createStackNavigator<MainStackParamList>();

const MainStack = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false
            }}
        >
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Users" component={UsersScreen} />
            <Stack.Screen name="UserForm" component={UserFormScreen} />
            <Stack.Screen name="Businesses" component={BusinessesScreen} />
            <Stack.Screen name="BusinessForm" component={BusinessFormScreen} />
            <Stack.Screen name="Surveys" component={SurveysScreen} />
            <Stack.Screen name="QRCodes" component={QRCodesScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Navigator>
    );
};

export default MainStack; 