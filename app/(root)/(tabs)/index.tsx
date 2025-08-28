import { Feather, FontAwesome, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import moment from "moment";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, LayoutAnimation, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, UIManager, View } from "react-native";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { PanGestureHandler } from "react-native-gesture-handler";
import Animated, { interpolateColor, runOnJS, useAnimatedGestureHandler, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import ColorPicker from "react-native-wheel-color-picker";
import tinycolor from "tinycolor2";
import TodaysSnapshotModal from "../../(root)/(tabs)/TodaySnapshot";
import { generateWeeklyInsights } from "../../../lib/insights";
import { useMealPlan } from "../../context/MealPlanContext";
import { useWellaura } from "../../WellauraContext";
import { WeatherWidget } from "./WeatherWidget";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- THEME & COLOR CONSTANTS (UNCHANGED) ---
const WELLAURA_WHISPER_COLORS = { name: "Wellaura's Whisper", colors: { primary: '#2B4E38', accent: '#7C9F80', background: '#D1D8DB', surface: '#FFFFFF', textPrimary: '#2C2C2C', textSecondary: '#2C2C2C', border: '#2B4E38', white: '#FFFFFF' }};
const DEFAULT_COLORS = WELLAURA_WHISPER_COLORS.colors;
const pastelColors = ['#FFFFFF', '#fde4cf', '#fbf8cc', '#d9f9cc', '#cce6ff', '#d9cce6', '#fccfcf', '#cfd8dc'];
const PRESET_THEMES = [ WELLAURA_WHISPER_COLORS, { name: 'Coastal Morning', colors: { primary: '#64748B', accent: '#94A3B8', background: '#F8FAFC', surface: '#FFFFFF', textPrimary: '#1E293B', textSecondary: '#64748B', border: '#E2E8F0', white: '#FFFFFF' }}, { name: 'Sun-kissed Peach', colors: { primary: '#D57A66', accent: '#EAC8AF', background: '#FCF8F5', surface: '#FFFFFF', textPrimary: '#5D4037', textSecondary: '#D57A66', border: '#F2E9E4', white: '#FFFFFF' }}, { name: 'Blush Petal', colors: { primary: '#D8A0A6', accent: '#F0D3D1', background: '#FDF7F6', surface: '#FFFFFF', textPrimary: '#5C4B49', textSecondary: '#D8A0A6', border: '#F4E9E8', white: '#FFFFFF' }}, { name: 'Wellaura Nightfall', colors: { primary: '#8CBCA7', accent: '#B0D4C4', background: '#1A2421', surface: '#25342E', textPrimary: '#F0FDF4', textSecondary: '#A1AFAF', border: '#3A4A44', white: '#FFFFFF' }}, { name: 'Dusk', colors: { primary: '#A1A1AA', accent: '#D4D4D8', background: '#232323', surface: '#3B3B3B', textPrimary: '#F4F4F5', textSecondary: '#A1A1AA', border: '#52525B', white: '#FFFFFF' }}, { name: 'Twilight Lilac', colors: { primary: '#A899E5', accent: '#C7BFDE', background: '#2B2936', surface: '#423E56', textPrimary: '#F5F3FF', textSecondary: '#A899E5', border: '#5C5679', white: '#FFFFFF' }}, { name: 'Deep Navy', colors: { primary: '#6B82B8', accent: '#AAB9D7', background: '#1C2541', surface: '#2A3A5B', textPrimary: '#F0F3F9', textSecondary: '#6B82B8', border: '#3B5282', white: '#FFFFFF' }},];

// --- STORAGE KEYS (UNCHANGED) ---
const WIDGETS_STORAGE_KEY = '@user_widgets_layout_v4';
const LAYOUT_STORAGE_KEY = '@user_layout_columns_v3';
const THEME_STORAGE_KEY = '@user_theme_v1';

// --- DYNAMIC STYLES (UNCHANGED) ---
const getDynamicStyles = (theme) => {
    const isSurfaceDark = tinycolor(theme.surface).isDark();
    const cardTextColor = isSurfaceDark ? theme.white : theme.textPrimary;
    const cardSecondaryTextColor = isSurfaceDark ? tinycolor(theme.white).setAlpha(0.7).toRgbString() : theme.textSecondary;
    return StyleSheet.create({
      screen: { flex: 1, backgroundColor: theme.background }, container: { flex: 1 }, headerContainer: { paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 25 : 0, paddingBottom: 16 }, headerWelcome: { padding: 20, backgroundColor: theme.surface, borderRadius: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, borderWidth: tinycolor.equals(theme.background, theme.surface) ? 1 : 0, borderColor: tinycolor.equals(theme.background, theme.surface) ? theme.border : 'transparent' }, headerName: { fontSize: 18, fontWeight: "bold", color: cardTextColor }, headerSubtitle: { fontSize: 14, color: cardSecondaryTextColor, marginTop: 4 }, headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 }, mainEditButton: { backgroundColor: theme.primary }, iconButton: { padding: 10, backgroundColor: theme.border, borderRadius: 20, justifyContent: 'center', alignItems: 'center', width: 42, height: 42 }, todayButton: { padding: 10, backgroundColor: tinycolor(theme.primary).setAlpha(0.12).toRgbString(), borderRadius: 20, width: 42, height: 42, justifyContent: 'center', alignItems: 'center' }, widgetContainer: { padding: 8 }, card: { borderRadius: 20, shadowColor: "#9FB1C4", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3, overflow: "hidden", padding: 16, borderWidth: tinycolor.equals(theme.background, theme.surface) ? 1 : 0, borderColor: tinycolor.equals(theme.background, theme.surface) ? theme.border : 'transparent' }, linkArea: { flex: 1, paddingTop: 12 }, cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, cardTitleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }, cardTitle: { fontWeight: "bold", fontSize: 18, color: cardTextColor }, cardText: { fontSize: 14, color: cardSecondaryTextColor, lineHeight: 22 }, dateText: { fontSize: 14, fontWeight: "bold", color: cardTextColor, marginBottom: 10 }, subTitle: { fontWeight: "bold", marginTop: 4, marginBottom: 6, color: cardTextColor, fontSize: 14 }, skeleton: { width: '100%', borderRadius: 16, marginTop: 12 }, resizeHandle: { position: "absolute", bottom: 0, right: 0, width: 30, height: 30, justifyContent: 'flex-end', alignItems: 'flex-end', padding: 4 }, editButton: { padding: 5, backgroundColor: tinycolor(cardTextColor).setAlpha(0.1).toRgbString(), borderRadius: 15 }, deleteButton: { position: 'absolute', top: 10, left: 10, backgroundColor: '#EF4444', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', zIndex: 10 }, deleteButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, lineHeight: 20 }, insightsCard: { backgroundColor: tinycolor(theme.accent).setAlpha(0.2).toRgbString(), borderRadius: 20, padding: 20, marginTop: 20, borderWidth: 1, borderColor: tinycolor(theme.accent).setAlpha(0.3).toRgbString(), overflow: 'hidden' }, insightsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, }, insightsContent: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: tinycolor(theme.accent).setAlpha(0.3).toRgbString() }, insightText: { fontSize: 15, color: theme.textPrimary, lineHeight: 22, marginBottom: 8 }, modalBackdrop: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" }, modalTitle: { fontSize: 22, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 20 }, colorModalContainer: { width: "90%", maxHeight: '80%', backgroundColor: theme.surface, borderRadius: 24, padding: 24, alignItems: "center" }, pickerWrapper: { height: 250, width: '100%', marginBottom: 20, }, swatchLabel: { fontSize: 16, fontWeight: '600', color: theme.textSecondary, alignSelf: 'flex-start', marginBottom: 10 }, swatchContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 }, swatch: { width: 36, height: 36, borderRadius: 18, margin: 4, borderWidth: 3 }, hexInputContainer: { flexDirection: 'row', alignItems: 'center', width: '100%' }, hexInput: { flex: 1, borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 10, height: 44, color: theme.textPrimary, fontSize: 16, fontWeight: '500' }, applyButton: { marginLeft: 10, backgroundColor: theme.border, paddingHorizontal: 15, height: 44, justifyContent: 'center', borderRadius: 12 }, applyButtonText: { fontWeight: 'bold', color: theme.textPrimary }, confirmButton: { marginTop: 24, paddingVertical: 14, paddingHorizontal: 40, backgroundColor: theme.primary, borderRadius: 20 }, confirmButtonText: { color: tinycolor(theme.primary).isDark() ? theme.white : theme.textPrimary, fontSize: 16, fontWeight: 'bold' }, themeEditorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border }, themeEditorLabel: { fontSize: 18, color: theme.textPrimary }, themeEditorSwatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: theme.border }, presetThemeScrollView: { paddingBottom: 10, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.border}, presetThemeCard: { width: 120, height: 120, borderRadius: 16, marginRight: 12, padding: 12, borderWidth: 3 }, presetThemeName: { fontWeight: 'bold', fontSize: 14 }, presetThemeColors: { flexDirection: 'row', marginTop: 'auto' }, presetThemeSwatch: { width: 20, height: 20, borderRadius: 10, marginRight: -8, borderWidth: 2 }, addWidgetItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.border, padding: 15, borderRadius: 15, marginBottom: 10 }, addWidgetItemText: { fontSize: 18, fontWeight: '500', marginLeft: 15, color: theme.textPrimary },
    });
};

// --- WIDGET COMPONENTS ---
const SkeletonLoader = ({ height, styles }) => { const shimmer = useSharedValue(0); useEffect(() => { shimmer.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false); }, []); const animatedStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(shimmer.value, [0, 0.5, 1], ['#E2E8F0', '#F1F5F9', '#E2E8F0']) })); return <Animated.View style={[styles.skeleton, { height: height - 40 }, animatedStyle]} />; };
const CalendarWidget = React.memo(({ styles }) => { const { calendarEvents } = useWellaura(); const today = moment(); const formattedDate = today.format("dddd, MMMM D"); const todaysEvents = calendarEvents.filter(e => moment(e.start).isSame(today, 'day') && !e.allDay).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()).slice(0, 3); return ( <View><Text style={styles.dateText}>{formattedDate}</Text><Text style={styles.subTitle}>Today's Agenda</Text>{todaysEvents.length > 0 ? (todaysEvents.map(event => (<Text key={event.id} style={styles.cardText} numberOfLines={1}>{moment(event.start).format('h:mma')} - {event.title}</Text>))) : (<Text style={styles.cardText}>No events scheduled today.</Text>)}</View> ); });
const BudgetWidget = React.memo(({ styles }) => { const { transactions, budgetSettings } = useWellaura(); const { totalIncome, totalExpenses } = useMemo(() => { const income = (budgetSettings.incomeVaries ? transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.budgetedAmount, 0) : parseFloat(budgetSettings.fixedIncome || '0')) || 0; const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.actualAmount ?? t.budgetedAmount), 0); return { totalIncome: income, totalExpenses: expenses }; }, [transactions, budgetSettings]); const remaining = totalIncome - totalExpenses; return <Text style={styles.cardText}>Remaining this period: £{remaining.toFixed(2)}</Text>; });
const MindfulnessWidget = React.memo(({ styles }) => (<View><Text style={styles.cardText}>How are you feeling today?</Text><Text style={{ fontSize: 24, marginTop: 5 }}>😌</Text></View>));
const MealPlannerWidget = React.memo(({ styles }) => { const { localMealPlan } = useMealPlan(); const dayOfWeek = moment().format('dddd'); const dinner = localMealPlan[dayOfWeek]?.dinner?.name; return <Text style={styles.cardText}>Tonight's Dinner: {dinner || 'Not planned'}</Text>; });
const CycleTrackerWidget = React.memo(({ styles }) => { const { cycleData } = useWellaura(); if (!cycleData || !cycleData.cycleStart) return <Text style={styles.cardText}>No cycle data yet.</Text>; const dayIndex = moment().diff(moment(cycleData.cycleStart), 'days'); return <Text style={styles.cardText}>Cycle Day: {dayIndex + 1}</Text>; });

// --- UPDATED HABITS WIDGET ---
const HabitsWidget = React.memo(({ styles }) => {
    const { habits, habitLogs } = useWellaura();
    const today = moment();
    const todayString = today.format('YYYY-MM-DD');
    const dayOfWeek = today.day();

    const allHabitsWithStatus = useMemo(() => {
        if (!habits || habits.length === 0) return [];

        const todaysLog = habitLogs?.[todayString] || {};
        return habits.map(habit => {
            const isScheduledToday = habit && Array.isArray(habit.days) && habit.days.includes(dayOfWeek);
            const isCompleted = !!todaysLog[habit.id];
            return {
                ...habit,
                isScheduledToday,
                isCompleted
            };
        });
    }, [habits, habitLogs, todayString, dayOfWeek]);

    if (allHabitsWithStatus.length === 0) {
        return <Text style={styles.cardText}>No habits set up yet.</Text>;
    }
    
    return (
        <View style={{ gap: 4 }}>
            {allHabitsWithStatus.slice(0, 3).map(habit => {
                const isInactive = !habit.isScheduledToday;
                const textStyle = [
                    styles.cardText,
                    habit.isCompleted && { textDecorationLine: "line-through" },
                    isInactive && { opacity: 0.5 } // Fade out habits not for today
                ];
                
                return (
                    <Text key={habit.id} style={textStyle}>
                        {habit.icon} {habit.name}
                    </Text>
                );
            })}
        </View>
    );
});

const InsightsWidget = React.memo(({ theme, styles }) => { const { habits, transactions, cycleData } = useWellaura(); const [isExpanded, setIsExpanded] = useState(false); const rotation = useSharedValue(0); const insights = useMemo(() => generateWeeklyInsights(habits, transactions, cycleData), [habits, transactions, cycleData]); const animatedIconStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] })); const toggleExpand = () => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setIsExpanded(!isExpanded); rotation.value = withTiming(isExpanded ? 0 : 180, { duration: 250 }); }; if (insights.length === 0) { return null; } return ( <TouchableOpacity activeOpacity={0.8} onPress={toggleExpand}><View style={styles.insightsCard}><View style={styles.insightsHeader}><Ionicons name="sparkles" size={22} color={theme.primary} /><Text style={[styles.cardTitle, {color: theme.textPrimary}]}>Your Weekly Insights</Text><Animated.View style={animatedIconStyle}><Ionicons name="chevron-down-outline" size={24} color={theme.primary} /></Animated.View></View>{isExpanded && ( <View style={styles.insightsContent}>{insights.map((insight, index) => (<Text key={index} style={styles.insightText}>• {insight}</Text>))}</View> )}</View></TouchableOpacity> );});
const ColorPickerModal = ({ isVisible, onClose, initialColor, onColorConfirm, theme, styles }) => { const [tempColor, setTempColor] = useState(initialColor); const [hexInput, setHexInput] = useState(tinycolor(initialColor).toHexString()); useEffect(() => { setTempColor(initialColor); setHexInput(tinycolor(initialColor).toHexString()); }, [initialColor, isVisible]); const handleColorChange = (color) => { setTempColor(color); setHexInput(tinycolor(color).toHexString()); }; const applyHexCode = () => { const color = tinycolor(hexInput); if (color.isValid()) { setTempColor(color.toHexString()); } else { Alert.alert("Invalid Color", "Please enter a valid HEX color code."); } }; return ( <Modal visible={isVisible} onRequestClose={onClose} transparent animationType="fade"><View style={styles.modalBackdrop}><View style={styles.colorModalContainer}><Text style={styles.modalTitle}>Choose a Color</Text><View style={styles.pickerWrapper}><ColorPicker color={tempColor} onColorChangeComplete={handleColorChange} thumbSize={30} sliderSize={20} noSnap={true} row={false} /></View><Text style={styles.swatchLabel}>Swatches</Text><View style={styles.swatchContainer}>{pastelColors.map(color => (<TouchableOpacity key={color} style={[styles.swatch, { backgroundColor: color, borderColor: tinycolor.equals(tempColor, color) ? theme.primary : theme.border }]} onPress={() => handleColorChange(color)} />))}</View><View style={styles.hexInputContainer}><TextInput style={styles.hexInput} value={hexInput} onChangeText={setHexInput} placeholder="#FFFFFF" autoCapitalize="none" /><TouchableOpacity style={styles.applyButton} onPress={applyHexCode}><Text style={styles.applyButtonText}>Apply</Text></TouchableOpacity></View><TouchableOpacity style={styles.confirmButton} onPress={() => onColorConfirm(tempColor)}><Text style={styles.confirmButtonText}>Done</Text></TouchableOpacity></View></View></Modal> );};
const ThemeEditorModal = ({ isVisible, onClose, theme, onColorSelect, onSelectPreset, styles }) => { const themeOptions = [ { key: 'background', label: 'Page Background' }, { key: 'surface', label: 'Widget Background' }, { key: 'textPrimary', label: 'Primary Text' }, { key: 'primary', label: 'Accent Color' }, ]; return ( <Modal visible={isVisible} onRequestClose={onClose} transparent animationType="fade"><View style={styles.modalBackdrop}><View style={[styles.colorModalContainer, {backgroundColor: theme.surface}]}><Text style={[styles.modalTitle, {color: tinycolor(theme.surface).isDark() ? theme.white : theme.textPrimary}]}>Edit Theme</Text><ScrollView style={{width: '100%'}}><Text style={[styles.swatchLabel, {color: tinycolor(theme.surface).isDark() ? tinycolor(theme.white).setAlpha(0.7).toRgbString() : theme.textSecondary}]}>Preset Themes</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetThemeScrollView}>{PRESET_THEMES.map(preset => ( <TouchableOpacity key={preset.name} onPress={() => onSelectPreset(preset.colors)}><View style={[styles.presetThemeCard, { backgroundColor: preset.colors.surface, borderColor: preset.colors.primary }]}><Text style={[styles.presetThemeName, { color: tinycolor(preset.colors.surface).isDark() ? preset.colors.white : preset.colors.textPrimary }]}>{preset.name}</Text><View style={styles.presetThemeColors}><View style={[styles.presetThemeSwatch, { backgroundColor: preset.colors.primary, borderColor: preset.colors.surface }]} /><View style={[styles.presetThemeSwatch, { backgroundColor: preset.colors.accent, borderColor: preset.colors.surface }]} /><View style={[styles.presetThemeSwatch, { backgroundColor: preset.colors.background, borderColor: preset.colors.surface }]} /></View></View></TouchableOpacity> ))}</ScrollView><Text style={[styles.swatchLabel, {color: tinycolor(theme.surface).isDark() ? tinycolor(theme.white).setAlpha(0.7).toRgbString() : theme.textSecondary}]}>Custom Colors</Text>{themeOptions.map(option => ( <TouchableOpacity key={option.key} style={styles.themeEditorRow} onPress={() => onColorSelect(option.key)}><Text style={[styles.themeEditorLabel, {color: tinycolor(theme.surface).isDark() ? theme.white : theme.textPrimary}]}>{option.label}</Text><View style={[styles.themeEditorSwatch, { backgroundColor: theme[option.key] }]} /></TouchableOpacity> ))}</ScrollView><TouchableOpacity style={[styles.confirmButton, {backgroundColor: theme.primary}]} onPress={onClose}><Text style={[styles.confirmButtonText, {color: tinycolor(theme.primary).isDark() ? theme.white : theme.textPrimary}]}>Done</Text></TouchableOpacity></View></View></Modal> );};

// --- WIDGET CONFIGURATION ---
type Widget = { key: string; path: string; title: string; icon: (theme: any, color: string) => React.ReactNode; component: React.FC<any>; height: number; color?: string };
const WIDGETS_TEMPLATE: Widget[] = [ { key: "calendar-widget", path: "./calendar", title: "Calendar & To-Do", icon: (theme, color) => <Ionicons name="calendar-outline" size={20} color={color} />, component: CalendarWidget, height: 240 }, { key: "budget-widget", path: "/(root)/(tabs)/budget", title: "Budget", icon: (theme, color) => <FontAwesome name="money" size={20} color={color} />, component: BudgetWidget, height: 160 }, { key: "habits-widget", path: "/(root)/(tabs)/habit-tracker", title: "Habits", icon: (theme, color) => <Ionicons name="checkmark-done-outline" size={20} color={color} />, component: HabitsWidget, height: 160 }, { key: "mindfulness-widget", path: "/(root)/(tabs)/mindfulness-page", title: "Mindfulness", icon: (theme, color) => <Ionicons name="leaf-outline" size={20} color={color} />, component: MindfulnessWidget, height: 160 }, { key: "meal-planner-widget", path: "/(root)/(tabs)/meal-planner", title: "Meal Planner", icon: (theme, color) => <Ionicons name="restaurant-outline" size={20} color={color} />, component: MealPlannerWidget, height: 160 }, { key: "cycle-tracker-widget", path: "/(root)/(tabs)/cycle", title: "Cycle Tracker", icon: (theme, color) => <Ionicons name="female-outline" size={20} color={color} />, component: CycleTrackerWidget, height: 160 },];
const WidgetRenderer = ({ item, isLoading, styles }) => { const WidgetComponent = item.component; return isLoading ? <SkeletonLoader height={item.height} styles={styles} /> : <WidgetComponent styles={styles} />; };

// --- ADD WIDGET MODAL ---
const AddWidgetModal = ({ isVisible, onClose, onAddWidget, availableWidgets, theme, styles }) => { return ( <Modal visible={isVisible} onRequestClose={onClose} transparent animationType="fade"><View style={styles.modalBackdrop}><View style={[styles.colorModalContainer, { backgroundColor: theme.background }]}><Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Add a Widget</Text><ScrollView style={{ width: '100%' }}>{availableWidgets.map(widget => { const icon = widget.icon(theme, theme.textPrimary); return ( <TouchableOpacity key={widget.key} style={styles.addWidgetItem} onPress={() => onAddWidget(widget)}>{icon}<Text style={styles.addWidgetItemText}>{widget.title}</Text></TouchableOpacity> );})}</ScrollView><TouchableOpacity style={[styles.confirmButton, { backgroundColor: theme.primary }]} onPress={onClose}><Text style={[styles.confirmButtonText, { color: tinycolor(theme.primary).isDark() ? theme.white : theme.textPrimary }]}>Done</Text></TouchableOpacity></View></View></Modal> );};

export default function Index() {
  const router = useRouter();
  const { isLoading } = useWellaura();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [numColumns, setNumColumns] = useState(2);
  const [isEditMode, setEditMode] = useState(false);
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [isThemeEditorVisible, setThemeEditorVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<{ type: 'widget' | 'theme', key: string } | null>(null);
  const [isSnapshotVisible, setSnapshotVisible] = useState(false);
  const [isAddWidgetModalVisible, setAddWidgetModalVisible] = useState(false);
  const [theme, setTheme] = useState(DEFAULT_COLORS);

  const styles = getDynamicStyles(theme);

  useEffect(() => { const loadData = async () => { await loadTheme(); await loadWidgetsAndLayout(); }; loadData(); }, []);

  const saveTheme = async (newTheme) => { try { await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(newTheme)); } catch (e) { console.error("Failed to save theme.", e); } };
  const loadTheme = async () => { try { const themeValue = await AsyncStorage.getItem(THEME_STORAGE_KEY); if (themeValue !== null) { setTheme(JSON.parse(themeValue)); } else { setTheme(DEFAULT_COLORS); } } catch(e) { console.error("Failed to load theme.", e); setTheme(DEFAULT_COLORS); } };
  const loadWidgetsAndLayout = async () => { await loadWidgets(); await loadLayout(); };
  const saveWidgets = async (newWidgets: Widget[]) => { try { const simplified = newWidgets.map(({ component, icon, ...rest }) => rest); await AsyncStorage.setItem(WIDGETS_STORAGE_KEY, JSON.stringify(simplified)); setWidgets(newWidgets); } catch (e) { console.error("Failed to save widgets.", e); } };
  const loadWidgets = async () => { try { const jsonValue = await AsyncStorage.getItem(WIDGETS_STORAGE_KEY); const savedData = jsonValue ? JSON.parse(jsonValue) : null; if (Array.isArray(savedData) && savedData.length > 0) { const hydrated = savedData.map(saved => { const template = WIDGETS_TEMPLATE.find(w => w.key === saved.key); return template ? { ...template, ...saved } : null; }).filter(Boolean); setWidgets(hydrated as Widget[]); } else { setWidgets(WIDGETS_TEMPLATE); } } catch (e) { console.error("Failed to load widgets.", e); setWidgets(WIDGETS_TEMPLATE); } };
  const loadLayout = async () => { try { const layoutValue = await AsyncStorage.getItem(LAYOUT_STORAGE_KEY); if (layoutValue !== null) { setNumColumns(JSON.parse(layoutValue)); } } catch(e) { console.error("Failed to load layout setting.", e); } };
  const updateWidgetProperty = (key: string, property: 'height' | 'color', value: any) => { const newWidgets = widgets.map(w => w.key === key ? { ...w, [property]: value } : w); saveWidgets(newWidgets); };
  
  const deleteWidget = (keyToDelete: string) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); const newWidgets = widgets.filter(w => w.key !== keyToDelete); saveWidgets(newWidgets); };
  const addWidget = (widgetToAdd: Widget) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); const newWidgets = [...widgets, widgetToAdd]; saveWidgets(newWidgets); setAddWidgetModalVisible(false); };

  const availableWidgets = useMemo(() => {
    const displayedWidgetKeys = new Set(widgets.map(w => w.key));
    return WIDGETS_TEMPLATE.filter(w => !displayedWidgetKeys.has(w.key));
  }, [widgets]);

  const handleSelectColorToEdit = (type: 'widget' | 'theme', key: string) => { setEditingItem({ type, key }); setThemeEditorVisible(false); setPickerVisible(true); };
  const handleCloseColorPicker = () => { setPickerVisible(false); setEditingItem(null); if (isThemeEditorVisible) { setThemeEditorVisible(true); } };
  const confirmColor = (newColor: string) => { if (editingItem) { if (editingItem.type === 'widget') { updateWidgetProperty(editingItem.key, 'color', newColor); } else if (editingItem.type === 'theme') { const newTheme = { ...theme, [editingItem.key]: newColor }; setTheme(newTheme); saveTheme(newTheme); } } handleCloseColorPicker(); };
  const handleSelectPresetTheme = (colors) => { setTheme(colors); saveTheme(colors); const newWidgets = widgets.map(w => ({ ...w, color: undefined })); saveWidgets(newWidgets); };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Widget>) => {
    const height = useSharedValue(item.height);
    const updateHeightInState = (newHeight: number) => { updateWidgetProperty(item.key, 'height', newHeight); };
    const panGestureHandler = useAnimatedGestureHandler({ onStart: (_, ctx: any) => { ctx.startHeight = height.value; }, onActive: (e, ctx: any) => { height.value = Math.max(120, ctx.startHeight + e.translationY); }, onEnd: () => { runOnJS(updateHeightInState)(height.value); }, });
    const animatedStyle = useAnimatedStyle(() => ({ height: height.value }));
    const itemSurfaceColor = item.color || theme.surface;
    const isItemSurfaceDark = tinycolor(itemSurfaceColor).isDark();
    const itemTextColor = isItemSurfaceDark ? theme.white : theme.textPrimary;
    const itemIcon = item.icon(theme, itemTextColor);
    return (
      <View style={[styles.widgetContainer, { width: numColumns === 2 ? "50%" : "100%" }]}>
        <TouchableOpacity onLongPress={isEditMode ? drag : undefined} disabled={!isEditMode} activeOpacity={0.8}>
          {isEditMode && ( <TouchableOpacity style={styles.deleteButton} onPress={() => deleteWidget(item.key)}><Text style={styles.deleteButtonText}>×</Text></TouchableOpacity> )}
          <Animated.View style={[styles.card, { backgroundColor: itemSurfaceColor, opacity: isActive ? 0.8 : 1 }, animatedStyle]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleContainer}>{itemIcon}<Text style={[styles.cardTitle, {color: itemTextColor}]}>{item.title}</Text></View>
                {isEditMode && (<TouchableOpacity style={[styles.editButton, {backgroundColor: tinycolor(itemTextColor).setAlpha(0.1).toRgbString()}]} onPress={() => handleSelectColorToEdit('widget', item.key)}><Feather name="edit-3" size={16} color={isItemSurfaceDark ? tinycolor(theme.white).setAlpha(0.7).toRgbString() : theme.textSecondary} /></TouchableOpacity>)}
              </View>
              <TouchableOpacity style={styles.linkArea} disabled={isEditMode} onPress={() => router.push(item.path)}>
                <WidgetRenderer item={item} isLoading={isLoading} styles={styles} />
              </TouchableOpacity>
              {isEditMode && (<PanGestureHandler onGestureEvent={panGestureHandler}><Animated.View style={styles.resizeHandle}><Ionicons name="resize" size={16} color={isItemSurfaceDark ? tinycolor(theme.white).setAlpha(0.7).toRgbString() : theme.textSecondary} /></Animated.View></PanGestureHandler>)}
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <DraggableFlatList
          key={numColumns} data={widgets} renderItem={renderItem} keyExtractor={(item) => item.key}
          numColumns={numColumns} onDragEnd={({ data }) => saveWidgets(data)} dragEnabled={isEditMode}
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              <View style={[styles.headerWelcome, {backgroundColor: theme.surface}]}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={styles.headerName}>Welcome back</Text>
                  <Text style={styles.headerSubtitle}>{moment().format("dddd, MMMM Do")}</Text>
                </View>
                <View style={styles.headerActions}>
                  {!isEditMode && (
                    <TouchableOpacity style={styles.todayButton} onPress={() => setSnapshotVisible(true)}>
                      <Ionicons name="sparkles-outline" size={22} color={tinycolor(theme.surface).isDark() ? theme.white : theme.primary} />
                    </TouchableOpacity>
                  )}
                  {isEditMode && (
                    <>
                      <TouchableOpacity style={[styles.iconButton, {backgroundColor: tinycolor(theme.surface).isDark() ? tinycolor(theme.white).setAlpha(0.1).toRgbString() : theme.border}]} onPress={() => setAddWidgetModalVisible(true)}>
                        <Ionicons name="add" size={22} color={tinycolor(theme.surface).isDark() ? theme.white : theme.textPrimary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.iconButton, {backgroundColor: tinycolor(theme.surface).isDark() ? tinycolor(theme.white).setAlpha(0.1).toRgbString() : theme.border}]} onPress={() => setThemeEditorVisible(true)}>
                        <Ionicons name="color-palette-outline" size={22} color={tinycolor(theme.surface).isDark() ? theme.white : theme.textPrimary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.iconButton, {backgroundColor: tinycolor(theme.surface).isDark() ? tinycolor(theme.white).setAlpha(0.1).toRgbString() : theme.border}]} onPress={() => { const newCols = numColumns === 1 ? 2 : 1; setNumColumns(newCols); AsyncStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(newCols)); }}>
                        <Ionicons name={numColumns === 1 ? "grid" : "list"} size={22} color={tinycolor(theme.surface).isDark() ? theme.white : theme.textPrimary} />
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity style={[styles.iconButton, {backgroundColor: tinycolor(theme.surface).isDark() ? tinycolor(theme.white).setAlpha(0.1).toRgbString() : theme.border}, isEditMode && {backgroundColor: theme.primary}]} onPress={() => setEditMode(!isEditMode)}>
                    <Feather name={isEditMode ? "check-square" : "edit-3"} size={22} color={isEditMode ? theme.white : (tinycolor(theme.surface).isDark() ? theme.white : theme.textPrimary)} />
                  </TouchableOpacity>
                </View>
              </View>
              <WeatherWidget theme={theme} />
              <InsightsWidget theme={theme} styles={styles} />
            </View>
          }
          ListFooterComponent={ <View style={{ height: 40 }} /> }
        />
      </View>
      <TodaysSnapshotModal
        visible={isSnapshotVisible}
        onClose={() => setSnapshotVisible(false)}
      />
      <ColorPickerModal 
        isVisible={isPickerVisible}
        onClose={handleCloseColorPicker}
        initialColor={editingItem?.type === 'widget' ? widgets.find(w => w.key === editingItem.key)?.color || theme.surface : theme[editingItem?.key || 'surface']}
        onColorConfirm={confirmColor}
        theme={theme}
        styles={styles}
      />
      <ThemeEditorModal
        isVisible={isThemeEditorVisible}
        onClose={() => setThemeEditorVisible(false)}
        theme={theme}
        onColorSelect={(key) => handleSelectColorToEdit('theme', key)}
        onSelectPreset={handleSelectPresetTheme}
        styles={styles}
      />
      <AddWidgetModal
        isVisible={isAddWidgetModalVisible}
        onClose={() => setAddWidgetModalVisible(false)}
        onAddWidget={addWidget}
        availableWidgets={availableWidgets}
        theme={theme}
        styles={styles}
      />
    </SafeAreaView>
  );
}