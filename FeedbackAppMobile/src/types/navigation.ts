import { Business } from '../services/businessService';

export type MainStackParamList = {
    Dashboard: undefined;
    Users: undefined;
    UserForm: { user?: any };
    Businesses: undefined;
    BusinessForm: { business?: Business };
    Surveys: undefined;
    QRCodes: undefined;
    Profile: undefined;
}; 