import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

/**
 * This is the layout for your tab bar.
 * It uses the default Expo Router tab bar with custom icons.
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        // You can set a global tint color for the active icon here
        tabBarActiveTintColor: '#1e2a3c', 
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false, // Hide header on the dashboard page
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
    </Tabs>
  );
}
