import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
    Auth: NavigatorScreenParams<AuthStackParamList>;
    Main: NavigatorScreenParams<MainTabParamList>;
};

export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

export type MainTabParamList = {
    Home: undefined;
    Surveys: undefined;
    Scan: undefined;
    Rewards: undefined;
    Profile: undefined;
}; 