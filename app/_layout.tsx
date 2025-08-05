// app/_layout.tsx

import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // 1. Import this
import { WellauraProvider } from './WellauraContext';
import { ThemeProvider } from './context/ThemeContext';
// ... other imports

export default function RootLayout() {
  return (
    // 2. Wrap everything with GestureHandlerRootView
    <GestureHandlerRootView style={{ flex: 1 }}> 
      <ThemeProvider>
        <WellauraProvider>
          <Stack>
            <Stack.Screen name="(root)" options={{ headerShown: false }} />
          </Stack>
        </WellauraProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}