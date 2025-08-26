import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWellaura } from '../../WellauraContext';
import { useCycle } from '../../context/CycleContext';
import { useTheme } from '../../context/ThemeContext';

// --- DYNAMIC STYLES ---
const getDynamicStyles = (theme: any) => StyleSheet.create({
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContainer: { width: '90%', maxHeight: '80%', backgroundColor: theme.surface, borderRadius: 24, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 12, marginBottom: 12 },
    title: { fontSize: 24, fontWeight: 'bold', color: theme.textPrimary },
    closeButton: { padding: 4 },
    content: { paddingBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.textPrimary, marginTop: 16, marginBottom: 8 },
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, padding: 12, borderRadius: 12, marginBottom: 8 },
    icon: { marginRight: 12, width: 24, textAlign: 'center' },
    textContainer: { flex: 1 },
    // Swapped styles for better visual hierarchy
    label: { color: theme.textPrimary, fontSize: 16, fontWeight: '600' },
    value: { color: theme.textSecondary, fontSize: 14, fontWeight: '500', marginTop: 2 },
});


// A simple, reusable row for the snapshot
const InfoRow = ({ icon, label, value, color, styles }: any) => (
    <View style={styles.row}>
        <Ionicons name={icon} size={24} color={color} style={styles.icon} />
        <View style={styles.textContainer}>
            <Text style={styles.label} numberOfLines={1}>{value}</Text>
            <Text style={styles.value}>{label}</Text>
        </View>
    </View>
);

// The main component
export const TodaySnapshot = ({ onClose }: { onClose: () => void }) => {
    const { theme } = useTheme();
    const { calendarEvents, habits, mealPlan } = useWellaura();
    const { cycleInfo, todaysInsight } = useCycle(); // Get cycle data from context
    const styles = getDynamicStyles(theme);

    const today = moment();
    const validEvents = (calendarEvents || []).filter(e => moment(e.start).isSame(today, 'day'));
    const validHabits = (habits || []).filter(Boolean);
    const todayMeals = mealPlan[today.format('dddd')] || {};

    return (
        <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
                <View style={styles.header}>
                    <Text style={styles.title}>Today's Snapshot</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close-circle" size={32} color={theme.textSecondary} />
                    </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={styles.content}>
                    
                    {/* NEW: Cycle Insights Section */}
                    {cycleInfo.dayOfCycle > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>♀️ Cycle Insights</Text>
                            <View style={styles.row}>
                                <Ionicons name="sync-circle-outline" size={24} color={theme.primary} style={styles.icon} />
                                <View style={styles.textContainer}>
                                    <Text style={styles.label}>Day {cycleInfo.dayOfCycle} - {cycleInfo.phaseForToday}</Text>
                                    <Text style={styles.value}>{todaysInsight}</Text>
                                </View>
                            </View>
                        </>
                    )}

                    {/* Calendar Section */}
                    <Text style={styles.sectionTitle}>🗓️ Calendar</Text>
                    {validEvents.length > 0 ? (
                        validEvents.map(event => (
                            <InfoRow key={event.id} icon="time-outline" label={moment(event.start).format('h:mm A')} value={event.title} color={theme.primary} styles={styles} />
                        ))
                    ) : (
                        <InfoRow icon="sunny-outline" label="All Day" value="No events scheduled." color={theme.textSecondary} styles={styles} />
                    )}

                    {/* Habits Section */}
                    <Text style={styles.sectionTitle}>🎯 Habits</Text>
                    {validHabits.length > 0 ? (
                        validHabits.map((habit: any) => (
                            <InfoRow key={habit.id} icon={habit.history?.[today.format('YYYY-MM-DD')]?.completed ? "checkmark-circle" : "ellipse-outline"} label="To Do" value={habit.name} color={theme.primary} styles={styles} />
                        ))
                    ) : (
                        <InfoRow icon="checkmark-done-circle-outline" label="All Done" value="No habits to track." color={theme.textSecondary} styles={styles} />
                    )}

                    {/* Meals Section */}
                    <Text style={styles.sectionTitle}>🍳 Meals</Text>
                    <InfoRow icon="cafe-outline" label={todayMeals?.breakfast?.time || 'Breakfast'} value={todayMeals?.breakfast?.name || 'Not planned'} color={theme.accent} styles={styles} />
                    <InfoRow icon="restaurant-outline" label={todayMeals?.lunch?.time || 'Lunch'} value={todayMeals?.lunch?.name || 'Not planned'} color={theme.accent} styles={styles} />
                    <InfoRow icon="moon-outline" label={todayMeals?.dinner?.time || 'Dinner'} value={todayMeals?.dinner?.name || 'Not planned'} color={theme.accent} styles={styles} />

                </ScrollView>
            </View>
        </View>
    );
};