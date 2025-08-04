import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { WellauraProvider } from './WellauraContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <WellauraProvider>
        <Stack>
          <Stack.Screen name="(root)" options={{ headerShown: false }} />
        </Stack>
      </WellauraProvider>
    </GestureHandlerRootView>
  );
}