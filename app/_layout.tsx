// app/_layout.tsx

import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CycleProvider } from './context/CycleContext'; // 1. Import CycleProvider
import { ThemeProvider } from './context/ThemeContext';
import { WellauraProvider } from './WellauraContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}> 
      <ThemeProvider>
        <WellauraProvider>
          {/* 2. Wrap your Stack with CycleProvider */}
          <CycleProvider> 
            <Stack>
              <Stack.Screen name="(root)" options={{ headerShown: false }} />
            </Stack>
          </CycleProvider>
        </WellauraProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}