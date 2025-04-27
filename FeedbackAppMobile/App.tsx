import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from './src/contexts/AuthContext';
import MainStack from './src/navigation/MainStack';
import { LogBox } from 'react-native';
import { setupPermissions } from './src/utils/permissions';

// Hata mesajlarını bastır
LogBox.ignoreLogs([
  'NativeUnimoduleProxy',
  'Exception in HostObject::get',
  'DETECT_SCREEN_CAPTURE',
  'Permission Denial',
  'registerScreenCaptureObserver',
  'java.lang.SecurityException'
]);

// Ana uygulama bileşeni
const App = () => {
  // İzinleri yapılandır
  useEffect(() => {
    setupPermissions().catch(err => {
      // Hata durumunda sessizce devam et
    });
  }, []);

  return (
    <NavigationContainer>
      <PaperProvider>
        <AuthProvider>
          <MainStack />
        </AuthProvider>
      </PaperProvider>
    </NavigationContainer>
  );
};

export default App;
