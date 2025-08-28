import { Stack } from 'expo-router';

export default function RootGroupLayout() {
  return (
    <Stack
      screenOptions={{
        // This line hides the "(root)" header for this specific group
        headerShown: false,
      }}
    />
  );
}