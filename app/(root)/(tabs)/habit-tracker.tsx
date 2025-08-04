import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useWellaura } from '../../WellauraContext';
import { Habit } from '../../types';

// --- SETUP & CONSTANTS ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLORS = {
    primary: '#F97316', accent: '#FACC15', background: '#FFF7ED', surface: '#FFFFFF',
    textPrimary: '#1E293B', textSecondary: '#64748B', destructive: '#DC2626',
    destructiveBg: '#FEE2E2', white: '#FFFFFF', border: '#F1F5F9',
};
const HABIT_COLOR_PALETTE = ['#F97316', '#34D399', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#8B5CF6', '#22C55E'];
const KEYWORD_ICON_MAP = { 'smoke': '🚭', 'vape': '💨', 'book': '📖', 'read': '📖', 'gym': '🏋️', 'workout': '💪', 'lift': '🏋️', 'exercise': '🏃‍♂️', 'water': '💧', 'drink': '💧', 'bath': '🛀', 'shower': '🚿', 'meditate': '🧘', 'mindful': '🧘', 'sleep': '😴', 'bed': '🛌', 'code': '💻', 'develop': '💻', 'clean': '🧼', 'tidy': '🧹', 'eat': '🍎', 'food': '🍎', 'salad': '🥗', 'healthy': '🥗', 'run': '🏃‍♂️', 'jog': '🏃‍♀️', 'walk': '🚶‍♂️', 'wake': '☀️', 'morning': '🌅', 'write': '✍️', 'journal': '📓', 'learn': '🧠', 'study': '🧠', 'stretch': '🤸‍♀️',};
const getIconForHabit = (habitName) => { const name = habitName.toLowerCase(); for (const keyword in KEYWORD_ICON_MAP) { if (name.includes(keyword)) { return KEYWORD_ICON_MAP[keyword]; } } return '🎯'; };
const getStartOfWeek = (date) => new Date(date.setDate(date.getDate() - date.getDay()));
const calculateCurrentWeekProgress = (habit) => { if (habit.type !== 'weekly_frequency' || !habit.history) return 0; const startOfWeek = getStartOfWeek(new Date()); let progress = 0; for (let i = 0; i < 7; i++) { const date = new Date(startOfWeek); date.setDate(date.getDate() + i); const dateString = date.toISOString().split('T')[0]; progress += habit.history[dateString]?.progress || 0; } return progress; };

// --- COMPONENTS ---
const Card = ({ children, style }) => (<Animated.View style={[styles.card, style]}>{children}</Animated.View>);

const HabitModal = ({ isVisible, onClose, onSave, habitToEdit }) => {
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('');
    const [type, setType] = useState<'daily_boolean' | 'weekly_frequency' | 'quit_habit'>('daily_boolean');
    const [color, setColor] = useState(HABIT_COLOR_PALETTE[0]);
    const [frequency, setFrequency] = useState('3');
    const [reminderDate, setReminderDate] = useState<Date | null>(null);
    const [showPicker, setShowPicker] = useState(false);
    const [addToCalendar, setAddToCalendar] = useState(false);

    useEffect(() => {
      if (habitToEdit) {
        setName(habitToEdit.name);
        setIcon(habitToEdit.icon);
        setType(habitToEdit.type);
        setColor(habitToEdit.color || HABIT_COLOR_PALETTE[0]);
        if (habitToEdit.reminderTime) {
            const [hour, minute] = habitToEdit.reminderTime.split(':').map(Number);
            const date = new Date();
            date.setHours(hour, minute);
            setReminderDate(date);
        } else { setReminderDate(null); }
        if (habitToEdit.type === 'weekly_frequency') { setFrequency(habitToEdit.goal.frequency.toString()); }
        setAddToCalendar(habitToEdit.addToCalendar || false);
      } else {
        setName(''); setIcon(''); setType('daily_boolean'); setFrequency('3'); setReminderDate(null);
        setColor(HABIT_COLOR_PALETTE[0]); setAddToCalendar(false);
      }
    }, [habitToEdit, isVisible]);

    const handleTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowPicker(Platform.OS === 'ios');
        if (selectedDate) { setReminderDate(selectedDate); }
        if (Platform.OS !== 'ios') { setShowPicker(false); }
    };

    const handleSave = async () => {
      if (!name) { Alert.alert("Missing Name", "Please give your habit a name."); return; }
      let finalIcon = icon.trim() || getIconForHabit(name);
      const reminderTimeString = reminderDate ? moment(reminderDate).format('HH:mm') : null;

      const baseData: Omit<Habit, 'type' | 'goal'> = {
        id: habitToEdit ? habitToEdit.id : Date.now().toString(),
        name, icon: finalIcon, color, reminderTime: reminderTimeString,
        notificationId: habitToEdit?.notificationId || null,
        history: habitToEdit?.history || {},
        addToCalendar: reminderDate ? addToCalendar : false,
      };

      if (baseData.notificationId) { await Notifications.cancelScheduledNotificationAsync(baseData.notificationId); baseData.notificationId = null; }

      if (type !== 'quit_habit' && baseData.reminderTime && reminderDate) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
            baseData.notificationId = await Notifications.scheduleNotificationAsync({
              content: { title: "Habit Reminder", body: `Time for your habit: ${name}!` },
              trigger: { hour: reminderDate.getHours(), minute: reminderDate.getMinutes(), repeats: true },
            });
        }
      }

      let habitData: Habit;
      if (type === 'weekly_frequency') {
        const newFrequency = parseInt(frequency, 10) || 1;
        habitData = { ...baseData, type: 'weekly_frequency', goal: { frequency: newFrequency, period: 'week' } };
      } else if (type === 'quit_habit') {
        habitData = { ...baseData, type: 'quit_habit', reminderTime: null, addToCalendar: false };
      } else {
        habitData = { ...baseData, type: 'daily_boolean' };
      }
      onSave(habitData);
      onClose();
    };

    const placeholderText = type === 'quit_habit' ? "e.g., Stop Smoking" : "e.g., Go for a walk";

    return (
        <Modal visible={isVisible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBackdrop}>
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>{habitToEdit ? 'Edit Habit' : 'New Habit'}</Text>
                    <ScrollView>
                        <Text style={styles.label}>Name</Text>
                        <TextInput style={styles.input} placeholder={placeholderText} value={name} onChangeText={setName} />
                        <Text style={styles.label}>Icon (optional)</Text>
                        <TextInput style={styles.input} placeholder="e.g., 🚶‍♂️ or 🚭" value={icon} onChangeText={setIcon} />
                        <Text style={styles.label}>Color</Text>
                        <View style={styles.colorSelector}>{HABIT_COLOR_PALETTE.map(c => (<TouchableOpacity key={c} onPress={() => setColor(c)} style={[styles.colorOption, { backgroundColor: c, borderWidth: color === c ? 3 : 0 }]} />))}</View>
                        <Text style={styles.label}>Habit Type</Text>
                        <View style={styles.typeSelector}><Pressable onPress={() => setType('daily_boolean')} style={[styles.typeButton, type === 'daily_boolean' && styles.typeButtonActive]}><Text style={[styles.typeButtonText, type === 'daily_boolean' && styles.typeButtonTextActive]}>Daily</Text></Pressable><Pressable onPress={() => setType('weekly_frequency')} style={[styles.typeButton, type === 'weekly_frequency' && styles.typeButtonActive]}><Text style={[styles.typeButtonText, type === 'weekly_frequency' && styles.typeButtonTextActive]}>Weekly</Text></Pressable><Pressable onPress={() => setType('quit_habit')} style={[styles.typeButton, type === 'quit_habit' && styles.typeButtonActive]}><Text style={[styles.typeButtonText, type === 'quit_habit' && styles.typeButtonTextActive]}>Quit</Text></Pressable></View>
                        {type === 'weekly_frequency' && (<View><Text style={styles.label}>Times Per Week</Text><TextInput style={styles.input} value={frequency} onChangeText={setFrequency} keyboardType="numeric" /></View>)}
                        {type !== 'quit_habit' && (
                            <>
                                <Text style={styles.label}>Daily Reminder</Text>
                                <TouchableOpacity style={styles.timePickerButton} onPress={() => setShowPicker(true)}><Text style={styles.timePickerButtonText}>{reminderDate ? moment(reminderDate).format('h:mm A') : "Set Time"}</Text></TouchableOpacity>
                                {showPicker && (
                                    <View>
                                        <DateTimePicker value={reminderDate || new Date()} mode="time" display="spinner" onChange={handleTimeChange} />
                                        {Platform.OS === 'ios' && <TouchableOpacity style={styles.iosPickerDoneButton} onPress={() => setShowPicker(false)}><Text style={styles.iosPickerDoneButtonText}>Done</Text></TouchableOpacity>}
                                    </View>
                                )}
                                {reminderDate && (
                                    <View style={styles.calendarToggleRow}>
                                        <Ionicons name="calendar-outline" size={24} color={COLORS.textSecondary} />
                                        <Text style={styles.label}>Add to Calendar</Text>
                                        <Switch value={addToCalendar} onValueChange={setAddToCalendar} trackColor={{ false: '#ccc', true: COLORS.primary }} thumbColor={COLORS.white} />
                                    </View>
                                )}
                            </>
                        )}
                        <View style={styles.modalActions}><Pressable style={[styles.button, styles.buttonSecondary]} onPress={onClose}><Text style={[styles.buttonText, styles.buttonSecondaryText]}>Cancel</Text></Pressable><Pressable style={styles.button} onPress={handleSave}><Text style={styles.buttonText}>Save</Text></Pressable></View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const HabitActionModal = ({ isVisible, onClose, onEdit, onDelete }) => (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.modalBackdrop} onPress={onClose}>
            <View style={[styles.modalContainer, styles.actionModal]}>
                <TouchableOpacity style={styles.actionModalButton} onPress={onEdit}><Ionicons name="create-outline" size={22} color={COLORS.textPrimary} /><Text style={styles.actionModalButtonText}>Edit Habit</Text></TouchableOpacity>
                <TouchableOpacity style={styles.actionModalButton} onPress={onDelete}><Ionicons name="trash-outline" size={22} color={COLORS.destructive} /><Text style={[styles.actionModalButtonText, { color: COLORS.destructive }]}>Delete Habit</Text></TouchableOpacity>
            </View>
        </Pressable>
    </Modal>
);

const GenericHabitWidget = ({ habit, onUpdate, onOpenMenu }) => {
    const today = new Date().toISOString().split('T')[0];
    const todayData = habit.history?.[today] || {};
    let isCompleted = false;
    let subtitle = '';
    let mainAction;
    const habitColor = habit.color || HABIT_COLOR_PALETTE[0];
    switch (habit.type) {
        case 'daily_boolean':
            isCompleted = todayData.completed || false;
            mainAction = (<TouchableOpacity style={styles.actionArea} onPress={() => onUpdate(habit.id)}><View style={isCompleted ? [styles.checkboxCompleted, { backgroundColor: habitColor }] : [styles.checkbox, { borderColor: habitColor }]}>{isCompleted && <Ionicons name="checkmark" size={20} color={COLORS.white} />}</View></TouchableOpacity>);
            break;
        case 'weekly_frequency':
            const currentProgress = calculateCurrentWeekProgress(habit);
            subtitle = `${currentProgress} of ${habit.goal.frequency} per week`;
            const hasProgressToday = (todayData.progress || 0) > 0;
            const buttonStyle = hasProgressToday ? { backgroundColor: habitColor } : { backgroundColor: habitColor + '20' }; 
            const textStyle = hasProgressToday ? { color: COLORS.white } : { color: habitColor };
            mainAction = (<TouchableOpacity style={[styles.progressButton, buttonStyle]} onPress={() => onUpdate(habit.id)}><Text style={[styles.progressText, textStyle]}>+1</Text></TouchableOpacity>);
            break;
        case 'quit_habit':
            const lapsesToday = todayData.progress || 0;
            isCompleted = lapsesToday > 0;
            subtitle = lapsesToday > 0 ? `${lapsesToday} ${lapsesToday > 1 ? 'lapses' : 'lapse'} today` : "0 lapses today. Keep it up!";
            mainAction = <TouchableOpacity style={styles.plusButton} onPress={() => onUpdate(habit.id)}><Ionicons name="add" size={24} color={COLORS.destructive} /></TouchableOpacity>;
            break;
    }
    const cardStyle = habit.type !== 'quit_habit' ? { borderLeftColor: habitColor, borderLeftWidth: 5 } : (isCompleted && styles.lapsedCard);
    return (
        <Card style={[cardStyle, isCompleted && habit.type !== 'quit_habit' && styles.completedCard]}>
            <View style={styles.habitHeader}>
                <Text style={styles.habitIcon}>{habit.icon}</Text>
                <View style={styles.habitTitleContainer}>
                    <Text style={[styles.habitTitle, isCompleted && habit.type !== 'quit_habit' && styles.completedText]}>{habit.name}</Text>
                    {subtitle && <Text style={[styles.habitSubtitle, isCompleted && habit.type !== 'quit_habit' && styles.completedText]}>{subtitle}</Text>}
                    {habit.reminderTime && <Text style={styles.reminderText}><Ionicons name="alarm-outline" size={12} /> {habit.reminderTime}</Text>}
                </View>
                <View style={styles.mainActionContainer}>{mainAction}</View>
                <TouchableOpacity style={styles.habitMenuButton} onPress={() => onOpenMenu(habit)}><Ionicons name="ellipsis-vertical" size={22} color={COLORS.textSecondary} /></TouchableOpacity>
            </View>
        </Card>
    );
};

const WaterTrackerWidget = ({ count, goal, onUpdate }) => {
  const progress = useSharedValue(0);
  useEffect(() => { progress.value = withTiming(count / goal, { duration: 500 }); }, [count, goal]);
  const animatedProgressStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  return (
    <Card>
      <View style={styles.habitHeader}><Text style={styles.habitIcon}>💧</Text><View style={styles.habitTitleContainer}><Text style={styles.habitTitle}>Water Tracker</Text><Text style={styles.habitSubtitle}>{count} of {goal} glasses</Text></View></View>
      <View style={styles.waterTrackerContainer}><TouchableOpacity style={styles.waterButton} onPress={() => onUpdate(-1)}><Ionicons name="remove" size={24} color={COLORS.primary} /></TouchableOpacity><View style={styles.waterBar}><Animated.View style={[styles.waterProgress, animatedProgressStyle]} /></View><TouchableOpacity style={styles.waterButton} onPress={() => onUpdate(1)}><Ionicons name="add" size={24} color={COLORS.primary} /></TouchableOpacity></View>
    </Card>
  );
};

export default function HabitTrackerPage() {
    const { habits, saveHabits, calendarEvents, saveCalendarEvents, isLoading } = useWellaura();
    const [waterCount, setWaterCount] = useState(4);
    const waterGoal = 8;
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [isActionModalVisible, setActionModalVisible] = useState(false);
    const [greeting, setGreeting] = useState('');
    const listOpacity = useSharedValue(0);
    const listTranslateY = useSharedValue(20);

    const handleAddOrUpdateHabit = (habitData: Habit) => {
        const exists = habits.some(h => h.id === habitData.id);
        const newHabits = exists ? habits.map(h => (h.id === habitData.id ? habitData : h)) : [...habits, habitData];
        saveHabits(newHabits);
        let updatedEvents = calendarEvents.filter(e => !e.id.startsWith(`habit-${habitData.id}`));
        if (habitData.addToCalendar && habitData.reminderTime) {
            const [hour, minute] = habitData.reminderTime.split(':').map(Number);
            for (let i = 0; i < 7; i++) {
                const eventDate = moment().add(i, 'days').hour(hour).minute(minute).second(0).toDate();
                const eventId = `habit-${habitData.id}-${moment(eventDate).format('YYYY-MM-DD')}`;
                updatedEvents.push({ id: eventId, title: `🎯 ${habitData.name}`, start: eventDate, end: new Date(eventDate.getTime() + 30 * 60 * 1000), color: habitData.color, type: 'habit' });
            }
        }
        saveCalendarEvents(updatedEvents);
        setEditingHabit(null);
        setIsModalVisible(false);
    };

    const handleDeleteHabit = async (habitId: string, notificationId?: string) => {
        Alert.alert("Delete Habit", "Are you sure? This will also delete its history.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                if (notificationId) { await Notifications.cancelScheduledNotificationAsync(notificationId); }
                saveHabits(habits.filter(h => h.id !== habitId));
                const updatedEvents = calendarEvents.filter(e => !e.id.startsWith(`habit-${habitId}`));
                saveCalendarEvents(updatedEvents);
            }}
        ]);
    };

    const handleUpdateProgress = (habitId) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); const today = new Date().toISOString().split('T')[0]; saveHabits(habits.map(h => { if (h.id === habitId) { const newHabit = { ...h, history: { ...(h.history || {}) } }; const todayData = newHabit.history[today] || {}; if (h.type === 'daily_boolean') { newHabit.history[today] = { completed: !todayData.completed }; } else if (h.type === 'weekly_frequency') { newHabit.history[today] = { ...todayData, progress: (todayData.progress || 0) + 1 }; } else if (h.type === 'quit_habit') { newHabit.history[today] = { progress: (todayData.progress || 0) + 1 }; } return newHabit; } return h; })); };
    const handleWaterUpdate = (amount) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setWaterCount(prev => Math.max(0, Math.min(waterGoal, prev + amount))); };
    const openEditModal = (habit) => { setEditingHabit(habit); setIsModalVisible(true); };
    const openAddModal = () => { setEditingHabit(null); setIsModalVisible(true); };
    const openActionMenu = (habit) => { setEditingHabit(habit); setActionModalVisible(true); };

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
        listOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
        listTranslateY.value = withDelay(200, withTiming(0, { duration: 500 }));
    }, []);
    
    const animatedListStyle = useAnimatedStyle(() => ({ opacity: listOpacity.value, transform: [{ translateY: listTranslateY.value }] }));
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    
    if (isLoading) { return ( <SafeAreaView style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator size="large" color={COLORS.primary} /></SafeAreaView> ); }
    
    return (
        <SafeAreaView style={styles.screen}>
            <Stack.Screen options={{ title: 'Habit Tracker', headerStyle: { backgroundColor: COLORS.background }, headerTitleStyle: { color: COLORS.textPrimary } }} />
            <HabitModal isVisible={isModalVisible} onClose={() => setIsModalVisible(false)} onSave={handleAddOrUpdateHabit} habitToEdit={editingHabit} />
            <HabitActionModal isVisible={isActionModalVisible} onClose={() => setActionModalVisible(false)} onEdit={() => { setActionModalVisible(false); openEditModal(editingHabit); }} onDelete={() => { setActionModalVisible(false); handleDeleteHabit(editingHabit.id, editingHabit.notificationId); }}/>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.headerContainer}><Text style={styles.dateText}>{todayStr.toUpperCase()}</Text><Text style={styles.headerTitle}>{greeting}</Text></View>
                <Animated.View style={animatedListStyle}>
                    <WaterTrackerWidget count={waterCount} goal={waterGoal} onUpdate={handleWaterUpdate} />
                    {habits.map(habit => ( <GenericHabitWidget key={habit.id} habit={habit} onUpdate={handleUpdateProgress} onOpenMenu={openActionMenu} /> ))}
                </Animated.View>
                <View style={styles.bottomButtonContainer}>
                    <TouchableOpacity style={[styles.bottomButton, styles.secondaryButton]} onPress={() => router.push('/(root)/(tabs)/habit-history')}><Ionicons name="stats-chart-outline" size={20} color={COLORS.primary} /><Text style={[styles.addHabitButtonText, styles.secondaryButtonText]}>History</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.bottomButton, styles.primaryButton]} onPress={openAddModal}><Ionicons name="add-outline" size={24} color={COLORS.white} /><Text style={styles.addHabitButtonText}>New Habit</Text></TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 16, paddingBottom: 120, gap: 16 },
  headerContainer: { marginBottom: 8 },
  dateText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.5 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: COLORS.textPrimary, marginTop: 4 },
  card: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 16, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 3 },
  completedCard: { opacity: 0.7, backgroundColor: '#FAFAFA' },
  lapsedCard: { backgroundColor: COLORS.destructiveBg, borderLeftColor: COLORS.destructive, borderLeftWidth: 5 },
  habitHeader: { flexDirection: 'row', alignItems: 'center' },
  habitIcon: { fontSize: 28, marginRight: 16 },
  habitTitleContainer: { flex: 1, gap: 2 },
  habitTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  completedText: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
  habitSubtitle: { fontSize: 14, color: COLORS.textSecondary },
  reminderText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, alignItems: 'center', display: 'flex' },
  mainActionContainer: { justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  actionArea: { paddingHorizontal: 8 },
  habitMenuButton: { padding: 8, marginLeft: 8 },
  checkbox: { width: 32, height: 32, borderRadius: 16, borderWidth: 2.5, justifyContent: 'center', alignItems: 'center' },
  checkboxCompleted: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  progressButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  progressText: { fontSize: 16, fontWeight: 'bold' },
  plusButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.destructiveBg, justifyContent: 'center', alignItems: 'center' },
  bottomButtonContainer: { flexDirection: 'row', gap: 16, marginTop: 24, },
  bottomButton: { flexDirection: 'row', gap: 8, borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', flex: 1, },
  primaryButton: { backgroundColor: COLORS.primary, },
  secondaryButton: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border },
  addHabitButtonText: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
  secondaryButtonText: { color: COLORS.primary, },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContainer: { backgroundColor: COLORS.surface, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center', color: COLORS.textPrimary },
  label: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, marginTop: 16, flex: 1 },
  input: { backgroundColor: COLORS.background, padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 10, color: COLORS.textPrimary },
  colorSelector: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingVertical: 10 },
  colorOption: { width: 36, height: 36, borderRadius: 18, borderColor: COLORS.primary },
  typeSelector: { flexDirection: 'row', backgroundColor: COLORS.background, borderRadius: 12, padding: 5, marginBottom: 10 },
  typeButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  typeButtonActive: { backgroundColor: COLORS.surface, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  typeButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary },
  typeButtonTextActive: { color: COLORS.primary },
  timePickerButton: { backgroundColor: COLORS.background, padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center' },
  timePickerButtonText: { fontSize: 16, color: COLORS.textPrimary, fontWeight: '500' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, gap: 10 },
  button: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.primary },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  buttonSecondary: { backgroundColor: COLORS.border },
  buttonSecondaryText: { color: COLORS.textSecondary },
  actionModal: { alignItems: 'center', gap: 10, paddingBottom: 40 },
  actionModalButton: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, width: '100%', borderRadius: 12, backgroundColor: COLORS.background },
  actionModalButtonText: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  waterTrackerContainer: { marginTop: 16, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 16 },
  waterBar: { height: 12, backgroundColor: '#F9731620', borderRadius: 6, flex: 1, overflow: 'hidden' },
  waterProgress: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 6 },
  waterButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F9731620', justifyContent: 'center', alignItems: 'center' },
  calendarToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, backgroundColor: COLORS.background, paddingVertical: 8, paddingHorizontal: 15, borderRadius: 12, },
  iosPickerDoneButton: { backgroundColor: COLORS.primary, padding: 15, alignItems: 'center', borderRadius: 10, marginHorizontal: 10, marginTop: 10 },
  iosPickerDoneButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' }
});