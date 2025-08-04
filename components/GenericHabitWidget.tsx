// components/GenericHabitWidget.tsx

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const GenericHabitWidget = ({ habit, onToggle }) => {
  const isCompleted = habit.completed;
  const iconName = isCompleted ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline';
  const iconColor = isCompleted ? '#22c55e' : '#6b7280';

  return (
    <TouchableOpacity style={styles.widgetContainer} onPress={onToggle}>
      <View style={styles.habitInfo}>
        <Icon name={habit.icon} size={24} color="#1f2937" />
        <Text style={styles.widgetTitle}>{habit.name}</Text>
      </View>
      <Icon name={iconName} size={30} color={iconColor} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  widgetContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  habitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  widgetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
});