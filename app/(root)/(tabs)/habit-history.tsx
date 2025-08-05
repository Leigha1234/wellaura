import { useTheme } from '.../../app/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import moment from 'moment';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import tinycolor from "tinycolor2";

// --- CONSTANTS ---
const DEFAULT_COLOR = '#34D399';
const HABITS_STORAGE_KEY = '@habits_v2';

// --- HELPER FUNCTIONS ---
const isDayCompleted = (habit, dayData) => {
    if (!dayData) return false;
    if (habit?.type === 'quit_habit') return (dayData.progress || 0) === 0;
    return dayData.completed;
};

const calculateStats = (habit) => {
    const history = habit?.history || {};
    const dates = Object.keys(history).sort();
    if (dates.length === 0) {
        return { current: 0, longest: 0, completionRate: 0 };
    }
    let currentStreak = 0;
    let longestStreak = 0;
    let completedDays = 0;
    const today = moment();
    let iterator = moment(dates[dates.length - 1]);
    if (today.diff(iterator, 'days') <= 1) {
        while (true) {
            const dateStr = iterator.format('YYYY-MM-DD');
            const dayData = history[dateStr];
            if (dayData && isDayCompleted(habit, dayData)) {
                currentStreak++;
                iterator.subtract(1, 'day');
            } else { break; }
        }
    }
    let tempStreak = 0;
    const firstDay = moment(dates[0]);
    for (let day = firstDay; day.isSameOrBefore(today); day.add(1, 'day')) {
        const dateStr = day.format('YYYY-MM-DD');
        const dayData = history[dateStr];
        if (dayData && isDayCompleted(habit, dayData)) {
            tempStreak++;
        } else {
            if (tempStreak > longestStreak) { longestStreak = tempStreak; }
            tempStreak = 0;
        }
    }
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);
    let totalTrackedDays = 0;
    Object.keys(history).forEach(date => {
        totalTrackedDays++;
        if (isDayCompleted(habit, history[date])) { completedDays++; }
    });
    const completionRate = totalTrackedDays > 0 ? Math.round((completedDays / totalTrackedDays) * 100) : 0;
    return { current: currentStreak, longest: longestStreak, completionRate };
};

// --- COMPONENTS ---
const StatCard = ({ label, value, icon, styles, theme }) => (
  <View style={styles.statCard}>
    <Ionicons name={icon} size={28} color={theme.primary} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const HabitHistoryDetails = ({ habit, onClearHistory, styles, theme }) => {
  if (!habit) {
    return (
      <View style={styles.detailsContainer}>
        <Text style={styles.noHabitText}>Select a habit to see its history.</Text>
      </View>
    );
  }
  const { current, longest, completionRate } = useMemo(() => calculateStats(habit), [habit]);
  const markedDates = useMemo(() => {
    const marks = {};
    if (!habit?.history) return {};
    const habitColor = habit.color || DEFAULT_COLOR;
    const destructiveColor = '#DC2626'; // This color remains static for its semantic meaning
    for (const date in habit.history) {
        const dayData = habit.history[date];
        if (habit.type === 'quit_habit' && (dayData.progress || 0) > 0) {
            marks[date] = { selected: true, selectedColor: destructiveColor };
        } else if (isDayCompleted(habit, dayData)) {
            marks[date] = { selected: true, selectedColor: habitColor };
        }
    }
    return marks;
  }, [habit]);
  const calendarTheme = {
      backgroundColor: theme.surface, calendarBackground: theme.surface, textSectionTitleColor: theme.textSecondary,
      selectedDayBackgroundColor: theme.primary, selectedDayTextColor: theme.white, todayTextColor: theme.primary,
      dayTextColor: theme.textPrimary, textDisabledColor: theme.border, arrowColor: theme.primary, monthTextColor: theme.textPrimary,
      textDayFontWeight: '500', textMonthFontWeight: 'bold', textDayHeaderFontWeight: '600',
  };
  const handleClear = () => {
    Alert.alert("Clear History", `Are you sure you want to clear all history for "${habit.name}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: () => onClearHistory(habit.id) }
    ]);
  };
  const rateLabel = habit.type === 'quit_habit' ? 'Success Rate' : 'Completion Rate';
  return (
    <View style={styles.detailsContainer}>
      <View style={styles.calendarWrapper}><Calendar markedDates={markedDates} theme={calendarTheme} /></View>
      <View style={styles.statsRow}>
        <StatCard label={rateLabel} value={`${completionRate}%`} icon="checkmark-done-circle-outline" styles={styles} theme={theme} />
        <StatCard label="Current Streak" value={`${current} days`} icon="flame-outline" styles={styles} theme={theme} />
        <StatCard label="Longest Streak" value={`${longest} days`} icon="trophy-outline" styles={styles} theme={theme} />
      </View>
      <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
        <Ionicons name="trash-outline" size={20} color={styles.clearButtonText.color} />
        <Text style={styles.clearButtonText}>Clear History for this Habit</Text>
      </TouchableOpacity>
    </View>
  );
};

// --- MAIN PAGE COMPONENT ---
export default function HabitHistoryPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = getDynamicStyles(theme);
  
  const [habits, setHabits] = useState([]);
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const loadHabits = async () => {
        setIsLoading(true);
        try {
          const storedHabits = await AsyncStorage.getItem(HABITS_STORAGE_KEY);
          const parsedHabits = storedHabits ? JSON.parse(storedHabits) : [];
          if (Array.isArray(parsedHabits) && parsedHabits.length > 0) {
            setHabits(parsedHabits);
            const currentSelected = parsedHabits.find(h => h.id === selectedHabit?.id) || parsedHabits[0];
            setSelectedHabit(currentSelected);
          } else {
            setHabits([]);
            setSelectedHabit(null);
          }
        } catch (e) { console.error("Failed to load habits from storage.", e); }
        finally { setIsLoading(false); }
      };
      loadHabits();
    }, [])
  );

  const handleClearHistory = async (habitId) => {
      const newHabits = habits.map(h => h.id === habitId ? { ...h, history: {} } : h);
      setHabits(newHabits);
      setSelectedHabit(newHabits.find(h => h.id === habitId) || newHabits[0] || null);
      await AsyncStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(newHabits));
  };

  const renderHabitChip = ({ item: habit }) => {
    if (!habit?.id) return null;
    const isSelected = selectedHabit?.id === habit.id;
    const habitColor = habit.color || theme.primary;
    const selectedStyle = isSelected ? { backgroundColor: habitColor } : {};
    const onHabitColor = tinycolor(habitColor).isDark() ? theme.white : theme.textPrimary;
    const selectedTextStyle = isSelected ? { color: onHabitColor } : {};
    
    return (
        <TouchableOpacity style={[ styles.habitChip, selectedStyle ]} onPress={() => setSelectedHabit(habit)}>
          <Text style={styles.habitChipIcon}>{habit.icon}</Text>
          <Text style={[styles.habitChipText, selectedTextStyle]}>{habit.name}</Text>
        </TouchableOpacity>
    );
  };

  if (isLoading) {
      return (
          <SafeAreaView style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator size="large" color={theme.primary} />
          </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ 
        title: 'Habit History', 
        headerStyle: { backgroundColor: theme.surface }, 
        headerTitleStyle: { color: theme.textPrimary },
        headerLeft: () => (
            <TouchableOpacity onPress={() => router.replace('/(root)/(tabs)/habit-tracker-page')} style={{ marginLeft: 16, padding: 4 }}>
                <Ionicons name="chevron-back-outline" size={28} color={theme.primary} />
            </TouchableOpacity>
        ),
      }} />
      <View style={styles.container}>
        <View style={styles.habitSelectorContainer}>
        {habits.length > 0 ? (
          <FlatList data={habits} renderItem={renderHabitChip} keyExtractor={(item) => item?.id?.toString()} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }} />
        ) : (
            <View style={styles.noHabitsContainer}>
                <Ionicons name="sad-outline" size={64} color={theme.textSecondary} />
                <Text style={styles.noHabitsMessage}>No habits tracked yet. Go add some!</Text>
            </View>
        )}
        </View>
        <ScrollView>
            <HabitHistoryDetails habit={selectedHabit} onClearHistory={handleClearHistory} styles={styles} theme={theme} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// --- STYLES ---
const getDynamicStyles = (theme) => {
    const destructiveColor = '#DC2626';
    const destructiveBgColor = '#FEE2E2';

    return StyleSheet.create({
        screen: { flex: 1, backgroundColor: theme.background },
        container: { flex: 1 },
        habitSelectorContainer: { borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.surface },
        noHabitsContainer: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center', gap: 16 },
        noHabitsMessage: { fontSize: 16, color: theme.textSecondary },
        habitChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 12, borderWidth: 1, borderColor: theme.border },
        habitChipIcon: { fontSize: 16, marginRight: 8 },
        habitChipText: { fontSize: 16, fontWeight: '600', color: theme.textPrimary },
        detailsContainer: { padding: 16, gap: 24 },
        noHabitText: { textAlign: 'center', fontSize: 16, color: theme.textSecondary, marginTop: 40 },
        calendarWrapper: { backgroundColor: theme.surface, borderRadius: 16, overflow: 'hidden', paddingBottom: 8 },
        statsRow: { flexDirection: 'row', justifyContent: 'space-around', gap: 12 },
        statCard: { alignItems: 'center', backgroundColor: theme.surface, padding: 16, borderRadius: 16, flex: 1, gap: 8, shadowColor: "#9FB1C4", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
        statValue: { fontSize: 22, fontWeight: 'bold', color: theme.textPrimary },
        statLabel: { fontSize: 13, color: theme.textSecondary, fontWeight: '500' },
        clearButton: { flexDirection: 'row', gap: 8, backgroundColor: destructiveBgColor, padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
        clearButtonText: { color: destructiveColor, fontSize: 16, fontWeight: '600' }
    });
};