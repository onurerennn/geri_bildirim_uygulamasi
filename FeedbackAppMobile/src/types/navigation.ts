import { Business } from '../services/businessService';
import { Survey, QRCode } from './index';
import { StackNavigationProp } from '@react-navigation/stack';

export type MainStackParamList = {
    Dashboard: undefined;
    Users: undefined;
    UserForm: { user?: any };
    Businesses: undefined;
    BusinessForm: { business?: Business };
    Surveys: undefined;
    SurveyForm: { survey?: Survey };
    SurveyDetails: { surveyId: string };
    SurveyQRCodes: { surveyId: string; surveyTitle?: string };
    QRCodeDetail: { qrCode: QRCode };
    QRCodes: undefined;
    Profile: undefined;
    ScanQRCode: undefined;
    SurveyResponse: { surveyId: string; qrCode?: string };
    // Auth screens
    Login: undefined;
    Register: undefined;
    Main: undefined;
};

export type AuthStackNavigationProp = StackNavigationProp<MainStackParamList, 'Login' | 'Register' | 'Main'>; 