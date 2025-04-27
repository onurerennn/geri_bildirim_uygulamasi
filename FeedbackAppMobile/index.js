import 'expo-dev-client'; // Expo geliştirme araçlarını içe aktar
import 'react-native-gesture-handler'; // Hareket yönetimini ekle
import { AppRegistry, LogBox } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './App';

// İzin hatalarını bastır
LogBox.ignoreLogs([
    'NativeUnimoduleProxy',
    'Exception in HostObject::get',
    'DETECT_SCREEN_CAPTURE',
    'Permission Denial',
    'registerScreenCaptureObserver',
    'java.lang.SecurityException'
]);

// Ana bileşeni kaydet
AppRegistry.registerComponent('main', () => App);

// Uygulama adını doğrudan giriyoruz
AppRegistry.registerComponent('FeedbackAppMobile', () => App);

// Son olarak Expo için kayıt yapıyoruz
registerRootComponent(App); 