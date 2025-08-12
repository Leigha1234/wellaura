import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { WellauraProvider } from './WellauraContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { MealPlanProvider } from './context/MealPlanContext';
import { ThemeProvider } from './context/ThemeContext';

export default function RootLayout() {
  return (
    // This wrapper is essential for drag-and-drop and other gestures
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Provides light/dark mode theme to the entire app */}
      <ThemeProvider>
        {/* Provides the global list of favorite meals */}
        <FavoritesProvider>
          {/* Provides your core app data (habits, etc.) */}
          <WellauraProvider>
            {/* Provides the meal plan and related functions to all screens */}
            <MealPlanProvider>
              {/* Controls the appearance of the native status bar */}
              <StatusBar style="light" />
              
              {/* The main navigator for your app */}
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
              </Stack>
            </MealPlanProvider>
          </WellauraProvider>
        </FavoritesProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}