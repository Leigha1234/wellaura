import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useTheme } from '../../context/ThemeContext'; // Import your theme hook

export default function TabLayout() {
  const { theme } = useTheme(); // Use your theme to get colors

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // This hides the header across all tabs
        tabBarActiveTintColor: theme.primary, // Use your theme's primary color
        tabBarInactiveTintColor: theme.textSecondary, // Use your theme's secondary color
        tabBarStyle: {
          backgroundColor: theme.surface, // Set the tab bar background color
          borderTopColor: theme.border,
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="track"
        options={{
          title: 'Track',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />

      {/* All other screens are hidden from the tab bar using href: null */}
      <Tabs.Screen name="budget-page" options={{ href: null }} />
      <Tabs.Screen name="calendar" options={{ href: null }} />
      <Tabs.Screen name="cycle" options={{ href: null }} />
      <Tabs.Screen name="habit-tracker-page" options={{ href: null }} />
      <Tabs.Screen name="meal-planner" options={{ href: null }} />
      <Tabs.Screen name="mindfulness-page" options={{ href: null }} />
      <Tabs.Screen name="habit-history" options={{ href: null }} />
      <Tabs.Screen name="journal-history" options={{ href: null }} />
      <Tabs.Screen name="new-workout" options={{ href: null }} />
      <Tabs.Screen name="sleep" options={{ href: null }} />
      <Tabs.Screen name="view-log" options={{ href: null }} />
      <Tabs.Screen name="water" options={{ href: null }} />
      <Tabs.Screen name="test" options={{ href: null }} />
      <Tabs.Screen name="sign-in" options={{ href: null }} />
      <Tabs.Screen name="laura" options={{ href: null }} />
      <Tabs.Screen name="recipes" options={{ href: null }} />
      <Tabs.Screen name="monthlymealview" options={{ href: null }} />
      <Tabs.Screen name="weeklymealview" options={{ href: null }} />
    </Tabs>
  );
}