import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { Link, usePathname } from 'expo-router'; // 1. Import usePathname instead of useRouterState
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const NavIcon = ({ href, icon, label, isActive, fa = false }) => {
  const IconComponent = fa ? FontAwesome : Ionicons;
  return (
    <Link href={href} asChild>
      <TouchableOpacity style={styles.navItem}>
        <IconComponent name={icon} size={24} color={isActive ? '#007AFF' : '#666'} />
        <Text style={[styles.navLabel, { color: isActive ? '#007AFF' : '#666' }]}>
          {label}
        </Text>
      </TouchableOpacity>
    </Link>
  );
};

export const CustomTabBar = () => {
  // 2. Use the usePathname() hook to get the current URL path as a string
  const pathname = usePathname();

  return (
    <View style={styles.bottomNav}>
      {/* 3. Update the isActive check to compare the pathname directly */}
      <NavIcon href="/" icon="home" label="Home" isActive={pathname === '/'} />
      <NavIcon href="/track" icon="line-chart" label="Track" fa isActive={pathname === '/track'} />
      <NavIcon href="/meal-planner" icon="leaf" label="Plan" isActive={pathname === '/meal-planner'} />
      <NavIcon href="/MindfulnessPage" icon="heart" label="Mindfulness" isActive={pathname === '/mindfulness-page'} />
      <NavIcon href="/profile" icon="person" label="Profile" isActive={pathname === '/profile'} />
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    height: 85,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 25,
    paddingTop: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});