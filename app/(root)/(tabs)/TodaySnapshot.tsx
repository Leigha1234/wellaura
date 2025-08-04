import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// A simple, reusable row for the snapshot
const InfoRow = ({ icon, label, value, color }) => (
    <View style={styles.row}>
        <Ionicons name={icon} size={24} color={color} style={styles.icon} />
        <View style={styles.textContainer}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value} numberOfLines={1}>{value}</Text>
        </View>
    </View>
);

// The main component
export const TodaySnapshot = ({ onClose, todayEvents, todayHabits, todayMeals, todayTransactions }) => {
    const today = moment();

    return (
        <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
                <View style={styles.header}>
                    <Text style={styles.title}>Today's Snapshot</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close-circle" size={32} color="#D1D5DB" />
                    </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={styles.content}>
                    {/* Calendar Section */}
                    <Text style={styles.sectionTitle}>🗓️ Calendar</Text>
                    {todayEvents.length > 0 ? (
                        todayEvents.map(event => (
                            <InfoRow key={event.id} icon="time-outline" label={moment(event.start).format('h:mm A')} value={event.title} color="#00796B" />
                        ))
                    ) : (
                        <InfoRow icon="sunny-outline" label="All Day" value="No events scheduled." color="#6B7280" />
                    )}

                    {/* Habits Section */}
                    <Text style={styles.sectionTitle}>🎯 Habits</Text>
                    {todayHabits.length > 0 ? (
                        todayHabits.map(habit => (
                            <InfoRow key={habit.id} icon={habit.history?.[today.format('YYYY-MM-DD')]?.completed ? "checkmark-circle" : "ellipse-outline"} label="To Do" value={habit.name} color={habit.color} />
                        ))
                    ) : (
                        <InfoRow icon="checkmark-done-circle-outline" label="All Done" value="No habits to track." color="#6B7280" />
                    )}

                    {/* Meals Section */}
                    <Text style={styles.sectionTitle}>🍳 Meals</Text>
                    <InfoRow icon="cafe-outline" label={todayMeals.breakfast.time} value={todayMeals.breakfast.name || 'Not planned'} color="#FACC15" />
                    <InfoRow icon="restaurant-outline" label={todayMeals.lunch.time} value={todayMeals.lunch.name || 'Not planned'} color="#FACC15" />
                    <InfoRow icon="moon-outline" label={todayMeals.dinner.time} value={todayMeals.dinner.name || 'Not planned'} color="#FACC15" />

                </ScrollView>
            </View>
        </View>
    );
};

// Styles for the Snapshot
const styles = StyleSheet.create({
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContainer: { width: '90%', maxHeight: '70%', backgroundColor: '#F9FAFB', borderRadius: 24, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 12, marginBottom: 12 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
    closeButton: { padding: 4 },
    content: { paddingBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 8 },
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, marginBottom: 8 },
    icon: { marginRight: 12, width: 24 },
    textContainer: { flex: 1 },
    label: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
    value: { color: '#1F2937', fontSize: 16, fontWeight: '600' },
});