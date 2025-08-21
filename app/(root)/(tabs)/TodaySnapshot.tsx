import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import moment from 'moment';
import React, { useMemo } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useWellaura } from '../../../app/WellauraContext';
import { useMealPlan } from '../../context/MealPlanContext';
import { useTheme } from '../../context/ThemeContext';

// SnapshotItem is purely for display
const SnapshotItem = ({ icon, text, subtext, time, styles }) => (
    <View style={styles.itemRow}>
        <Ionicons name={icon} size={24} color={styles.itemIcon.color} style={styles.itemIcon} />
        <View style={styles.itemInfo}>
            <Text style={styles.itemText} numberOfLines={1}>{text}</Text>
            {subtext && <Text style={styles.itemSubtext}>{subtext}</Text>}
        </View>
        {time && <Text style={styles.itemTime}>{time}</Text>}
    </View>
);

export default function TodaysSnapshotModal({ visible, onClose }) {
    const { theme } = useTheme();
    const styles = getDynamicStyles(theme);
    const navigation = useNavigation();

    const { calendarEvents, habits, habitLogs } = useWellaura();
    const { localMealPlan } = useMealPlan();

    const today = moment().startOf('day');
    const todayString = today.format('YYYY-MM-DD');

    const handleNavigate = (screen) => {
        onClose();
        setTimeout(() => {
            navigation.navigate(screen);
        }, 250);
    };

    const todaysMeals = useMemo(() => {
        if (!localMealPlan) return [];
        const dayName = today.format('dddd');
        const todaysPlan = localMealPlan[dayName];
        if (!todaysPlan) return [];
        const meals = [
            { type: 'Breakfast', ...todaysPlan.breakfast },
            { type: 'Lunch', ...todaysPlan.lunch },
            { type: 'Dinner', ...todaysPlan.dinner },
            ...(todaysPlan.snacks || []).map(snack => ({ type: 'Snack', ...snack }))
        ];
        return meals.filter(meal => meal.name);
    }, [localMealPlan, today]);

    const todaysEvents = useMemo(() => {
        if (!calendarEvents) return [];
        return calendarEvents.filter(event => moment(event.start).isSame(today, 'day'));
    }, [calendarEvents, today]);
    
    // --- THIS LOGIC IS NOW FIXED ---
    // It will now show ALL habits, not just ones scheduled for today.
    const todaysHabits = useMemo(() => {
        if (!habits || habits.length === 0) return []; // Return early if no habits exist at all.

        const todaysLog = habitLogs?.[todayString] || {};
        
        // We now map over ALL habits instead of filtering them, ensuring they are always visible.
        return habits.map(habit => ({
            ...habit,
            isCompleted: !!todaysLog[habit.id]
        }));
    }, [habits, habitLogs, todayString]);

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPressOut={onClose}>
                <TouchableWithoutFeedback>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.headerTitle}>Today's Snapshot</Text>
                                <Text style={styles.headerSubtitle}>{today.format("dddd, MMMM Do")}</Text>
                            </View>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close-circle" size={30} color={theme.primary} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {/* Meals Section */}
                            <TouchableOpacity activeOpacity={0.7} onPress={() => handleNavigate('meal-planner')}>
                                <View style={styles.card}>
                                    <View style={styles.cardTitleContainer}>
                                        <Text style={styles.cardTitle}>Today's Meals</Text>
                                        <Ionicons name="chevron-forward" size={22} color={theme.textSecondary} />
                                    </View>
                                    {todaysMeals.length > 0 ? (
                                        todaysMeals.map((meal, index) => (
                                            <SnapshotItem key={`meal-${index}`} icon="restaurant-outline" text={meal.name} subtext={meal.type} time={meal.time} styles={styles} />
                                        ))
                                    ) : (
                                        <Text style={styles.placeholderText}>No meals planned for today.</Text>
                                    )}
                                </View>
                            </TouchableOpacity>

                            {/* Calendar Events Section */}
                             <TouchableOpacity activeOpacity={0.7} onPress={() => handleNavigate('calendar')}>
                                <View style={styles.card}>
                                     <View style={styles.cardTitleContainer}>
                                        <Text style={styles.cardTitle}>Today's Agenda</Text>
                                        <Ionicons name="chevron-forward" size={22} color={theme.textSecondary} />
                                    </View>
                                    {todaysEvents.length > 0 ? (
                                        todaysEvents.map((event) => (
                                            <SnapshotItem key={event.id} icon="calendar-outline" text={event.title} time={moment(event.start).format('HH:mm')} styles={styles} />
                                        ))
                                    ) : (
                                        <Text style={styles.placeholderText}>No events scheduled for today.</Text>
                                    )}
                                </View>
                            </TouchableOpacity>

                            {/* Habits Section */}
                            <TouchableOpacity activeOpacity={0.7} onPress={() => handleNavigate('habit-tracker')}>
                                <View style={[styles.card, { marginBottom: 40 }]}>
                                     <View style={styles.cardTitleContainer}>
                                        <Text style={styles.cardTitle}>Today's Habits</Text>
                                        <Ionicons name="chevron-forward" size={22} color={theme.textSecondary} />
                                    </View>
                                    {todaysHabits && todaysHabits.length > 0 ? (
                                        todaysHabits.map((habit) => (
                                            <SnapshotItem key={habit.id} icon={habit.isCompleted ? 'checkmark-circle' : 'ellipse-outline'} text={habit.name} styles={styles} />
                                        ))
                                    ) : (
                                        // This text is now more accurate.
                                        <Text style={styles.placeholderText}>No habits set up yet.</Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </TouchableWithoutFeedback>
            </TouchableOpacity>
        </Modal>
    );
}

const getDynamicStyles = (theme) => StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: theme.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 15,
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 10,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: theme.textPrimary },
    headerSubtitle: { fontSize: 16, color: theme.textSecondary },
    card: {
        backgroundColor: theme.surface,
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
    },
    cardTitleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardTitle: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: theme.textPrimary,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: theme.border,
    },
    itemIcon: { marginRight: 15, color: theme.primary },
    itemInfo: { flex: 1 },
    itemText: { fontSize: 16, color: theme.textPrimary, fontWeight: '600' },
    itemSubtext: { fontSize: 14, color: theme.textSecondary, paddingTop: 2 },
    itemTime: { fontSize: 14, color: theme.textSecondary, fontWeight: '500' },
    placeholderText: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', paddingVertical: 20, fontStyle: 'italic' },
});