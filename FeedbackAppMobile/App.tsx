import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from './src/contexts/AuthContext';
import MainStack from './src/navigation/MainStack';

const App = () => {
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
